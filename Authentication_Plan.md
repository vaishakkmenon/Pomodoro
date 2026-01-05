# Pomodoro App: Authentication & Premium Access Plan

> **Goal**: Implement site-wide authentication using Supabase Auth with Magic Link login, and restrict Spotify Auto-DJ features to whitelisted "Premium" users.

---

## Architecture Overview

| Layer | Technology |
|-------|------------|
| Auth Provider | Supabase Auth (Magic Link / Email OTP) |
| Database | Supabase PostgreSQL |
| Frontend Auth | `@supabase/supabase-js` client |
| Session Management | Supabase handles sessions automatically |
| Premium Check | `allowed_users` table whitelist |
| User-Spotify Link | `users` table bridges site auth ↔ Spotify |

**Key Design Decisions**:
1. Site auth (Supabase) and Spotify auth (OAuth) are **separate** - users can use different emails
2. Premium status is checked against the **site email** (in `allowed_users`), not Spotify email
3. Once connected, Spotify account is linked to the site user by **user ID** (not email)
4. Only the linked site user can control that Spotify account

---

## Security Model

### Authentication Flow
```
1. User logs in via Magic Link (Supabase Auth)
   └─> Creates entry in auth.users (managed by Supabase)
   └─> Trigger creates entry in public.users table
   └─> Premium check: Is site email in allowed_users?

2. Premium user clicks "Connect Spotify"
   └─> Frontend checks: Is user logged in AND premium?
   └─> If yes, redirects to Spotify OAuth
   └─> User authorizes with ANY Spotify account (can be different email)
   └─> Callback links Spotify to site user by USER ID (not email)

3. All Spotify API calls verify:
   └─> Valid Spotify session cookie
   └─> Spotify account is linked to a site user
   └─> Site user is still premium (re-check on sensitive operations)
```

### Security Measures

| Threat | Mitigation |
|--------|------------|
| **Database breach** | Supabase encryption at rest, SSL in transit, RLS policies |
| **Token theft from DB** | Service role key only in edge functions, never exposed to client |
| **SQL injection** | Supabase client uses parameterized queries |
| **Unauthorized Spotify access** | Triple-gate: UI + frontend hook + backend edge function |
| **Session hijacking** | Supabase secure cookies, short-lived JWTs, HttpOnly flags |
| **Email enumeration** | Magic link sent regardless of email existence |
| **Brute force** | Supabase built-in rate limiting on auth endpoints |
| **CSRF on OAuth** | State parameter with crypto.randomUUID() validated on callback |
| **XSS token exposure** | Tokens stored server-side only, never in localStorage/cookies |
| **Privilege escalation** | RLS ensures users only access their own data |

### Database Security (Supabase Built-in)

| Feature | Protection |
|---------|------------|
| **Encryption at Rest** | AES-256 encryption for all data (Supabase default) |
| **Encryption in Transit** | TLS 1.2+ for all connections |
| **Row Level Security** | Policies enforce per-user data isolation |
| **Connection Pooling** | PgBouncer prevents connection exhaustion attacks |
| **Backup & Recovery** | Daily backups with point-in-time recovery |
| **Network Isolation** | Database not directly accessible from internet |
| **API Gateway** | All queries go through Supabase API with auth validation |

### Data Protection

| Data | Storage | Access | Encryption |
|------|---------|--------|------------|
| User email | `auth.users` | User only via JWT | At rest (Supabase) |
| Site user profile | `users` | Own record only (RLS) | At rest (Supabase) |
| Premium whitelist | `allowed_users` | Own email only (RLS) | At rest (Supabase) |
| Spotify tokens | `spotify_accounts` | Edge functions only | At rest (Supabase) |
| User preferences | `spotify_preferences` | Own data only (RLS) | At rest (Supabase) |

### Token Security

Spotify access/refresh tokens are sensitive. Here's how we protect them:

1. **Never exposed to frontend** - Tokens only accessed by edge functions using service role
2. **RLS blocks client access** - Even if someone tries to query `spotify_accounts`, RLS blocks it
3. **Service role isolation** - `SUPABASE_SERVICE_ROLE_KEY` only exists in Netlify edge functions
4. **Short-lived access tokens** - Spotify access tokens expire in 1 hour, we refresh as needed
5. **Encrypted at rest** - Supabase encrypts all data with AES-256

---

## Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================
-- 1. USERS TABLE (Links site auth to Spotify)
-- ============================================
-- This table bridges Supabase Auth with Spotify accounts.
-- Created automatically when user first logs in.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  spotify_user_id TEXT UNIQUE,  -- NULL until they connect Spotify
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_spotify_id ON users(spotify_user_id);

-- ============================================
-- 2. ALLOWED USERS (Premium whitelist)
-- ============================================
-- This table controls who can access Spotify features.
-- Add emails manually via Supabase dashboard or SQL.

CREATE TABLE IF NOT EXISTS allowed_users (
  email TEXT PRIMARY KEY,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT  -- Optional: reason for access, e.g., "beta tester", "friend"
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON allowed_users(email);

-- ============================================
-- 3. UPDATE SPOTIFY_ACCOUNTS (Add user link)
-- ============================================
-- Add foreign key to link Spotify accounts to site users.
-- Note: Only run this if spotify_accounts table already exists.

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spotify_accounts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE spotify_accounts ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX idx_spotify_accounts_user_id ON spotify_accounts(user_id);
  END IF;
END $$;

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_preferences ENABLE ROW LEVEL SECURITY;

-- USERS: Users can only read/update their own record
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Note: INSERT handled by trigger (see below)

-- ALLOWED_USERS: Users can only check their own email
CREATE POLICY "Users can check their own premium status"
  ON allowed_users FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- SPOTIFY_ACCOUNTS: Users can only view their own linked account
-- Note: Edge functions use service_role which bypasses RLS
CREATE POLICY "Users can view own Spotify account"
  ON spotify_accounts FOR SELECT
  USING (
    user_id = auth.uid() OR
    spotify_user_id = (SELECT spotify_user_id FROM users WHERE id = auth.uid())
  );

-- SPOTIFY_PREFERENCES: Users can manage their own preferences
CREATE POLICY "Users can view own preferences"
  ON spotify_preferences FOR SELECT
  USING (
    spotify_user_id = (SELECT spotify_user_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own preferences"
  ON spotify_preferences FOR INSERT
  WITH CHECK (
    spotify_user_id = (SELECT spotify_user_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own preferences"
  ON spotify_preferences FOR UPDATE
  USING (
    spotify_user_id = (SELECT spotify_user_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- 5. AUTO-CREATE USER ON SIGNUP (Trigger)
-- ============================================
-- Automatically creates a public.users record when someone signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. UPDATE TIMESTAMP TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 7. SEED DATA (Optional - add your premium users)
-- ============================================
-- INSERT INTO allowed_users (email, notes) VALUES
--   ('your-email@example.com', 'Owner'),
--   ('friend@example.com', 'Beta tester');
```

---

## Dependencies

Install Supabase client library (if not already installed):

```bash
npm install @supabase/supabase-js
```

---

## File Structure (New Files)

```
src/
├── lib/
│   └── supabase.ts              # Supabase client initialization
├── hooks/
│   └── useSiteAuth.ts           # Site authentication hook
├── components/
│   └── auth/
│       ├── LoginButton.tsx      # Login/logout button
│       └── LoginModal.tsx       # Magic link login modal
└── types/
    └── auth.ts                  # Auth-related types
```

---

## Phase 1: Supabase Client Setup

### 1.1 Types

**File**: `src/types/auth.ts`

```typescript
import type { User } from "@supabase/supabase-js";

export interface SiteAuthState {
  user: User | null;
  isPremium: boolean;
  isLoading: boolean;
}

export interface PremiumCheckResult {
  isPremium: boolean;
  isActive: boolean;
}
```

### 1.2 Supabase Client

**File**: `src/lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Phase 2: Authentication Hook

### 2.1 Site Auth Hook

**File**: `src/hooks/useSiteAuth.ts`

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, AuthError } from "@supabase/supabase-js";

interface UseSiteAuthReturn {
  user: User | null;
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useSiteAuth(): UseSiteAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check premium status by querying allowed_users table
  const checkPremiumStatus = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("is_active")
        .eq("email", email.toLowerCase())
        .single();

      if (error) {
        // PGRST116 = no rows found, which means not premium
        if (error.code === "PGRST116") {
          return false;
        }
        console.error("[Auth] Premium check error:", error);
        return false;
      }

      return data?.is_active ?? false;
    } catch (err) {
      console.error("[Auth] Premium check failed:", err);
      return false;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser?.email) {
        const premium = await checkPremiumStatus(currentUser.email);
        setIsPremium(premium);
      }

      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser?.email) {
          const premium = await checkPremiumStatus(currentUser.email);
          setIsPremium(premium);
        } else {
          setIsPremium(false);
        }

        // Clear error on successful login
        if (event === "SIGNED_IN") {
          setError(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkPremiumStatus]);

  // Magic Link login
  const login = useCallback(async (email: string) => {
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        // Redirect back to the app after clicking the magic link
        emailRedirectTo: typeof window !== "undefined"
          ? window.location.origin
          : undefined,
      },
    });

    if (error) {
      setError(error.message);
    }

    return { error };
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
    setUser(null);
    setIsPremium(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isPremium,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}
```

---

## Phase 3: UI Components

### 3.1 Login Button

**File**: `src/components/auth/LoginButton.tsx`

```tsx
"use client";

import { useState } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";
import { LoginModal } from "./LoginModal";

export function LoginButton() {
  const { user, isPremium, isLoading, logout } = useSiteAuth();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/50">
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isPremium && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full">
              Premium
            </span>
          )}
          <span className="text-sm text-white/70 truncate max-w-[150px]">
            {user.email}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-white/70 hover:text-white transition-colors"
      >
        Log in
      </button>
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
    </>
  );
}
```

### 3.2 Login Modal

**File**: `src/components/auth/LoginModal.tsx`

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { login, error, clearError } = useSiteAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    clearError();

    const { error } = await login(email);

    setIsSubmitting(false);

    if (!error) {
      setEmailSent(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm mx-4 p-6 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl">
        {emailSent ? (
          // Success state
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
            <p className="text-white/60 text-sm mb-4">
              We sent a magic link to <span className="text-white">{email}</span>
            </p>
            <p className="text-white/40 text-xs mb-6">
              Click the link in the email to sign in. You can close this modal.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          // Login form
          <>
            <h2 className="text-xl font-semibold text-white mb-2">Log in</h2>
            <p className="text-white/60 text-sm mb-6">
              Enter your email to receive a magic link.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
              />

              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="w-full mt-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send magic link"
                )}
              </button>
            </form>

            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 4: Integration with Existing Components

### 4.1 Update Timer Component

**File**: `src/components/timer/Timer.tsx`

Add the LoginButton to the header and gate Spotify features behind `isPremium`:

```typescript
// Add import at top:
import { LoginButton } from "@/components/auth/LoginButton";
import { useSiteAuth } from "@/hooks/useSiteAuth";

// Inside the Timer component, add:
const { isPremium, isLoading: authLoading } = useSiteAuth();

// In the header section, add LoginButton:
<div className="mb-4 flex items-center justify-between">
  {/* Left side: hamburger menu */}
  <div className="flex items-center gap-3">
    {/* ... existing hamburger button ... */}
  </div>

  {/* Right side: Auth + Spotify */}
  <div className="flex items-center gap-4">
    <LoginButton />
    {/* Only show SpotifyConnect if user is premium */}
    {isPremium && <SpotifyConnect />}
  </div>
</div>

// Update the Spotify settings toggle condition:
{isPremium && isAuthenticated && (
  <div className="mt-6 flex justify-center">
    <button
      onClick={() => setSpotifyOpen(!spotifyOpen)}
      className="text-sm text-white/50 hover:text-white transition-colors"
    >
      {spotifyOpen ? "Hide Music Settings" : "Show Music Settings"}
    </button>
  </div>
)}

// Update the MusicSettings panel condition:
{spotifyOpen && isPremium && isAuthenticated && (
  <div className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
    <MusicSettings />
  </div>
)}
```

### 4.2 Update Spotify Sync Hook (Optional Safety)

**File**: `src/hooks/useSpotifySync.ts`

Add premium check as an extra safety layer:

```typescript
// Add import:
import { useSiteAuth } from "@/hooks/useSiteAuth";

// Inside useSpotifySync:
const { isPremium } = useSiteAuth();

// Update syncPlayback to check premium:
const syncPlayback = useCallback(
  (state: TimerState) => {
    // Skip if not authenticated OR not premium
    if (!isAuthenticated || !isPremium) {
      return;
    }
    // ... rest of the function
  },
  [isAuthenticated, isPremium, debounceMs, onError]
);
```

### 4.3 Update SpotifyConnect Component

**File**: `src/components/spotify/SpotifyConnect.tsx`

Update the login function to pass the site user ID:

```typescript
// Add import:
import { useSiteAuth } from "@/hooks/useSiteAuth";

// Inside SpotifyConnect component:
const { user: siteUser } = useSiteAuth();

// Update the login function:
const handleConnect = () => {
  if (!siteUser?.id) {
    console.error("No site user - should not be able to click this button");
    return;
  }
  // Pass site user ID to edge function for verification and linking
  window.location.href = `/api/spotify/login?user_id=${siteUser.id}`;
};
```

### 4.4 Handle Spotify Errors on Frontend

**File**: `src/components/spotify/SpotifyConnect.tsx` or `src/app/page.tsx`

Display errors from OAuth callback:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Error messages for user display
const SPOTIFY_ERROR_MESSAGES: Record<string, string> = {
  not_logged_in: "Please log in first before connecting Spotify.",
  invalid_user: "Your session has expired. Please log in again.",
  not_premium: "Spotify features require special access.",
  spotify_already_linked: "This Spotify account is already connected to a different account.",
  not_linked: "Your Spotify account is not properly linked. Please reconnect.",
  access_denied: "Spotify connection was cancelled.",
  invalid_state: "Session expired. Please try again.",
  server_error: "Something went wrong. Please try again.",
};

export function SpotifyErrorHandler() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const spotifyError = searchParams.get("spotify_error");
    if (spotifyError) {
      setError(SPOTIFY_ERROR_MESSAGES[spotifyError] || "An error occurred.");
      // Clear the URL param
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  if (!error) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
      <div className="flex items-start gap-3">
        <span>{error}</span>
        <button
          onClick={() => setError(null)}
          className="text-red-300 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

### 4.5 Logout Should Clear Spotify Session

**File**: `src/hooks/useSiteAuth.ts`

When user logs out of site, also clear their Spotify session:

```typescript
// Update the logout function:
const logout = useCallback(async () => {
  setError(null);

  // Clear Spotify session first (if connected)
  try {
    await fetch("/api/spotify/logout", { method: "POST", credentials: "include" });
  } catch {
    // Ignore errors - Spotify might not be connected
  }

  // Then sign out of site
  await supabase.auth.signOut();
  setUser(null);
  setIsPremium(false);
}, []);
```

---

## Phase 5: Backend Gatekeeper (Edge Function)

### 5.1 Update Spotify Login

**File**: `netlify/edge-functions/spotify-login.ts`

Include site user ID in OAuth state for linking after callback:

```typescript
import { getAuthUrl } from "./_shared/spotify.ts";
import { getSupabase } from "./_shared/supabase.ts";

export default async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Get site user ID from query param (passed by frontend)
    // Frontend gets this from Supabase session
    const siteUserId = url.searchParams.get("user_id");

    if (!siteUserId) {
      // No site user = not logged in to site
      return new Response(null, {
        status: 302,
        headers: { Location: "/?error=not_logged_in" },
      });
    }

    // Verify user exists and is premium BEFORE starting OAuth
    const supabase = getSupabase();

    const { data: siteUser, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", siteUserId)
      .single();

    if (userError || !siteUser) {
      console.warn("[Login] Invalid site user ID:", siteUserId);
      return new Response(null, {
        status: 302,
        headers: { Location: "/?error=invalid_user" },
      });
    }

    // Check if site user is premium (by their SITE email)
    const { data: isPremium } = await supabase
      .from("allowed_users")
      .select("is_active")
      .eq("email", siteUser.email.toLowerCase())
      .single();

    if (!isPremium?.is_active) {
      console.warn("[Login] Non-premium user attempted Spotify connect:", siteUser.email);
      return new Response(null, {
        status: 302,
        headers: { Location: "/?error=not_premium" },
      });
    }

    // Generate state with site user ID for linking after OAuth
    const state = JSON.stringify({
      csrf: crypto.randomUUID(),
      siteUserId: siteUser.id,  // Will link Spotify to this user
    });
    const encodedState = btoa(state);

    const authUrl = getAuthUrl(encodedState);
    const isProduction = Deno.env.get("NETLIFY") === "true";
    const secureFlag = isProduction ? "; Secure" : "";

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
        "Set-Cookie": `spotify_oauth_state=${encodedState}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax${secureFlag}`,
      },
    });
  } catch (error) {
    console.error("[Login] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
```

### 5.2 Update Frontend to Pass User ID

**File**: `src/hooks/useSpotifyAuth.ts` (or wherever login is triggered)

```typescript
// When redirecting to Spotify login, include the site user ID:
const login = useCallback(() => {
  if (!user?.id) {
    console.error("No site user logged in");
    return;
  }
  // Pass site user ID so edge function can verify and link
  window.location.href = `/api/spotify/login?user_id=${user.id}`;
}, [user]);
```

### 5.3 Update Spotify Callback

**File**: `netlify/edge-functions/spotify-callback.ts`

Link Spotify to site user (no email matching required):

```typescript
import { exchangeCodeForTokens, getCurrentUser } from "./_shared/spotify.ts";
import { getSupabase } from "./_shared/supabase.ts";
import { createSessionCookie } from "./_shared/session.ts";

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Get stored state from cookie
  const cookies = request.headers.get("Cookie") || "";
  const storedStateMatch = cookies.match(/spotify_oauth_state=([^;]+)/);
  const storedState = storedStateMatch ? storedStateMatch[1] : null;

  // Handle errors from Spotify
  if (error) {
    console.error("[OAuth] Error from Spotify:", error);
    return redirectWithError("access_denied");
  }

  // Validate CSRF state
  if (!code || !state || state !== storedState) {
    console.error("[OAuth] Invalid state or missing code");
    return redirectWithError("invalid_state");
  }

  // Parse state to get site user ID
  let siteUserId: string;
  try {
    const stateData = JSON.parse(atob(state));
    siteUserId = stateData.siteUserId;
    if (!siteUserId) throw new Error("Missing siteUserId");
  } catch {
    console.error("[OAuth] Invalid state format");
    return redirectWithError("invalid_state");
  }

  const supabase = getSupabase();

  try {
    // ============================================
    // STEP 1: VERIFY SITE USER EXISTS AND IS PREMIUM
    // ============================================
    const { data: siteUser, error: userError } = await supabase
      .from("users")
      .select("id, email, spotify_user_id")
      .eq("id", siteUserId)
      .single();

    if (userError || !siteUser) {
      console.warn("[OAuth] Site user not found:", siteUserId);
      return redirectWithError("invalid_user");
    }

    // Re-verify premium status (by SITE email, not Spotify email)
    const { data: isPremium } = await supabase
      .from("allowed_users")
      .select("is_active")
      .eq("email", siteUser.email.toLowerCase())
      .single();

    if (!isPremium?.is_active) {
      console.warn("[OAuth] User no longer premium:", siteUser.email);
      return redirectWithError("not_premium");
    }

    // ============================================
    // STEP 2: EXCHANGE CODE FOR SPOTIFY TOKENS
    // ============================================
    const tokens = await exchangeCodeForTokens(code);
    const spotifyUser = await getCurrentUser(tokens.access_token);

    // ============================================
    // STEP 3: CHECK FOR CONFLICTS
    // ============================================
    // Is this Spotify account already linked to a DIFFERENT site user?
    const { data: existingLink } = await supabase
      .from("users")
      .select("id, email")
      .eq("spotify_user_id", spotifyUser.id)
      .single();

    if (existingLink && existingLink.id !== siteUser.id) {
      console.warn(`[OAuth] Spotify ${spotifyUser.id} already linked to different user`);
      return redirectWithError("spotify_already_linked");
    }

    // Does this site user already have a DIFFERENT Spotify account linked?
    if (siteUser.spotify_user_id && siteUser.spotify_user_id !== spotifyUser.id) {
      // They're switching Spotify accounts - that's OK, update the link
      console.log(`[OAuth] User ${siteUser.id} switching Spotify accounts`);
    }

    // ============================================
    // STEP 4: SAVE SPOTIFY TOKENS
    // ============================================
    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

    const { error: dbError } = await supabase.from("spotify_accounts").upsert({
      spotify_user_id: spotifyUser.id,
      user_id: siteUser.id,
      email: spotifyUser.email,
      display_name: spotifyUser.display_name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    }, {
      onConflict: "spotify_user_id",
    });

    if (dbError) {
      console.error("[OAuth] Database error:", dbError);
      throw new Error("Database error");
    }

    // ============================================
    // STEP 5: LINK SPOTIFY TO SITE USER
    // ============================================
    const { error: linkError } = await supabase
      .from("users")
      .update({ spotify_user_id: spotifyUser.id })
      .eq("id", siteUser.id);

    if (linkError) {
      console.error("[OAuth] Link error:", linkError);
    }

    // ============================================
    // STEP 6: CREATE SESSION & REDIRECT
    // ============================================
    const sessionCookie = await createSessionCookie(spotifyUser.id);

    const headers = new Headers();
    headers.set("Location", "/?spotify=connected");
    headers.append("Set-Cookie", sessionCookie);
    headers.append("Set-Cookie", "spotify_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");

    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error("[OAuth] Callback error:", err);
    return redirectWithError("server_error");
  }
}

function redirectWithError(error: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `/?spotify_error=${error}` },
  });
}
```

### 5.4 Update Other Edge Functions to Verify User

**File**: `netlify/edge-functions/spotify-sync.ts` (and other API endpoints)

Verify the Spotify account is linked to a valid premium site user:

```typescript
// At the start of the handler, after getting the Spotify session:
const spotifyUserId = await getSession(request);
if (!spotifyUserId) {
  return errorResponse("Unauthorized", 401, "NO_SESSION");
}

// Verify this Spotify account is linked to a premium site user
const supabase = getSupabase();
const { data: linkedUser, error: linkError } = await supabase
  .from("users")
  .select("id, email")
  .eq("spotify_user_id", spotifyUserId)
  .single();

if (linkError || !linkedUser) {
  return errorResponse("Spotify account not linked", 401, "NOT_LINKED");
}

// Re-verify premium status on sensitive operations
const { data: isPremium } = await supabase
  .from("allowed_users")
  .select("is_active")
  .eq("email", linkedUser.email.toLowerCase())
  .single();

if (!isPremium?.is_active) {
  return errorResponse("Premium access revoked", 403, "NOT_PREMIUM");
}

// Continue with the rest of the handler...
```

// Continue with the rest of the handler...
```

### 5.5 Create Logout Endpoint

**File**: `netlify/edge-functions/spotify-logout.ts`

Ensure a clean slate by deleting all Spotify-related cookies.

```typescript
export default async function handler(request: Request): Promise<Response> {
  const headers = new Headers();

  // Clear session cookie
  headers.append("Set-Cookie", "spotify_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");

  // Clear OAuth state cookie (prevent reuse)
  headers.append("Set-Cookie", "spotify_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");

  return new Response("Logged out", {
    status: 200,
    headers,
  });
}
```

---

## Phase 6: Supabase Auth Configuration

### 6.1 Enable Email Auth in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Under **Email Auth**, configure:
   - Enable "Confirm email" (Magic Link)
   - Set "Mailer OTP Expiration" (default: 1 hour)

### 6.2 Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `http://localhost:3000` (local dev)
   - `https://pomodoro.vaishakmenon.com` (production)

### 6.3 Customize Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the "Magic Link" template with your branding

---

## Environment Variables

Ensure these are set (already exist in `.env.local`):

```bash
# Already configured:
NEXT_PUBLIC_SUPABASE_URL=https://qewfluytcvnsmfszxgdh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

No additional env vars needed for site auth.

---

## Implementation Order for IDE Agent

Execute in this exact sequence:

### Phase A: Dependencies & Database Setup
1. **Install dependencies**: `npm install @supabase/supabase-js`
2. **Run SQL schema** in Supabase SQL Editor (Database Schema section)
   - Creates `users` table (links site auth to Spotify)
   - Creates `allowed_users` table (premium whitelist)
   - Adds `user_id` column to `spotify_accounts`
   - Sets up RLS policies on all tables (including INSERT for preferences)
   - Creates auto-user trigger for signups
3. **Configure Supabase Auth** (Phase 6.1, 6.2)
   - Enable Email provider
   - Add redirect URLs for localhost and production
4. **Add yourself to `allowed_users`** table for testing

### Phase B: Frontend Auth
5. **Create `src/types/auth.ts`** (Phase 1.1)
6. **Create `src/lib/supabase.ts`** (Phase 1.2)
7. **Create `src/hooks/useSiteAuth.ts`** (Phase 2.1) - Include logout clearing Spotify (Phase 4.5)
8. **Create `src/components/auth/LoginButton.tsx`** (Phase 3.1)
9. **Create `src/components/auth/LoginModal.tsx`** (Phase 3.2)
10. **Test Auth Flow**: Verify login/logout works, user created in `users` table

### Phase C: Integration
11. **Update `Timer.tsx`** (Phase 4.1) - Add LoginButton, gate Spotify behind isPremium
12. **Update `useSpotifySync.ts`** (Phase 4.2) - Add premium safety check
13. **Update `SpotifyConnect.tsx`** (Phase 4.3) - Pass site user ID to login
14. **Create `SpotifyErrorHandler`** (Phase 4.4) - Display OAuth errors
15. **Test Premium Gating**: Verify non-premium users can't see Spotify controls

### Phase D: Backend Gatekeeper
16. **Update `spotify-login.ts`** (Phase 5.1) - Verify user & premium before OAuth
17. **Update `spotify-callback.ts`** (Phase 5.3) - Link Spotify to site user
17. **Update `spotify-callback.ts`** (Phase 5.3) - Link Spotify to site user
18. **Create `spotify-logout.ts`** (Phase 5.5) - Clear cookies
19. **Update `spotify-sync.ts`** (Phase 5.4) - Add user verification
19. **Update `spotify-playlists.ts`** (Phase 5.4) - Add user verification
20. **Update `spotify-settings.ts`** (Phase 5.4) - Add user verification
21. **Update `spotify-session.ts`** (Phase 5.4) - Add user verification

### Phase E: Testing
22. **Test Full Flow** (use Testing Checklist):
    - Site auth flow
    - Premium gating (UI + backend)
    - Spotify connection flow
    - Backend security tests
    - Logout flow
    - Edge cases

---

## Testing Checklist

### Site Auth
- [ ] Visit site → see "Log in" button in header
- [ ] Click "Log in" → modal appears
- [ ] Enter email → receive magic link email
- [ ] Click magic link → redirected back, logged in
- [ ] Check `users` table → new record created with correct email
- [ ] Refresh page → still logged in (session persists)
- [ ] Click "Log out" → logged out, redirected to home

### Premium Gating (Non-Premium User)
- [ ] Log in with email NOT in `allowed_users`
- [ ] Verify "Connect Spotify" button is hidden
- [ ] Verify no "Premium" badge shown
- [ ] Manually navigate to `/api/spotify/login?user_id=<your-id>` → redirected with `not_premium` error

### Premium Gating (Premium User)
- [ ] Add your email to `allowed_users` table
- [ ] Log in with that email
- [ ] Verify "Premium" badge appears next to email
- [ ] Verify "Connect Spotify" button appears
- [ ] Can connect Spotify and use Auto-DJ

### Spotify Connection Flow
- [ ] Click "Connect Spotify" → redirected to Spotify auth
- [ ] Authorize → redirected back with `?spotify=connected`
- [ ] Check `spotify_accounts` table → tokens saved with `user_id` link
- [ ] Check `users` table → `spotify_user_id` populated
- [ ] Music Settings panel accessible

### Backend Security Tests
- [ ] `/api/spotify/login` with no `user_id` param → `not_logged_in` error
- [ ] `/api/spotify/login` with invalid `user_id` → `invalid_user` error
- [ ] `/api/spotify/login` with non-premium user → `not_premium` error
- [ ] Try connecting Spotify account already linked to another user → `spotify_already_linked` error
- [ ] Call `/api/spotify/sync` without valid session → `401 NO_SESSION`
- [ ] Remove user from `allowed_users` then call API → `403 NOT_PREMIUM`

### Logout Flow
- [ ] Log out of site → Spotify session also cleared
- [ ] After logout, Spotify features hidden
- [ ] Re-login → can reconnect Spotify

### Edge Cases
- [ ] User switches Spotify accounts → old link updated, new tokens saved
- [ ] Session expires mid-use → graceful error handling
- [ ] Multiple browser tabs → auth state syncs correctly

---

## Error Handling

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| `not_logged_in` | Tried to connect Spotify without site login | "Please log in first before connecting Spotify." |
| `invalid_user` | Site user ID not found in database | "Your session has expired. Please log in again." |
| `not_premium` | Site email not in `allowed_users` | "Spotify features require special access." |
| `spotify_already_linked` | Spotify account linked to another site user | "This Spotify account is already connected to a different account." |
| `not_linked` | Spotify session exists but no user link | "Your Spotify account is not properly linked. Please reconnect." |
| `access_denied` | User denied Spotify OAuth | "Spotify connection was cancelled." |
| `invalid_state` | CSRF check failed or state parsing error | "Session expired. Please try again." |
| `server_error` | Internal error | "Something went wrong. Please try again." |

---

## Security Notes

### Authentication Security
- **Passwordless Auth**: Magic Link eliminates password-related attacks (credential stuffing, weak passwords)
- **Magic Link Expiry**: Links expire after 1 hour (configurable in Supabase)
- **Rate Limiting**: Supabase has built-in rate limiting on auth endpoints (prevents brute force)
- **Email Enumeration Protection**: Magic link sent regardless of whether email exists

### Data Protection
- **Row Level Security (RLS)**: All tables have RLS enabled
  - Users can only query their own data
  - `allowed_users`: Users can only check their own email
  - `spotify_accounts`: Users can only see their own linked account
  - `spotify_preferences`: Users can only manage their own preferences
- **Service Role Isolation**: `SUPABASE_SERVICE_ROLE_KEY` only used in edge functions, never exposed to client
- **Token Storage**: Spotify tokens stored server-side only, never in browser localStorage/cookies

### OAuth Security
- **CSRF Protection**: State parameter with crypto.randomUUID() validated on callback
- **Account Linking**: Spotify linked to site user by ID (different emails allowed)
- **Conflict Prevention**: Can't link a Spotify account already used by another site user
- **Multi-layer Gating**: UI + Frontend hook + Backend edge function all verify premium status
- **Premium verified twice**: Once at OAuth start, again at callback (prevents race conditions)

### What We DON'T Store
- Passwords (passwordless auth)
- Spotify tokens in browser (server-side only)
- Full user profile data (minimal data principle)

### Potential Improvements (Future)
- Encrypt Spotify tokens at rest (adds complexity, requires key management)
- Implement token rotation on each use
- Add audit logging for sensitive operations
- Consider IP-based session binding

---

## Future Enhancements (Out of Scope)

1. **Social Login**: Add Google/GitHub OAuth providers
2. **Premium Subscription**: Integrate Stripe for paid access
3. **Admin Dashboard**: UI to manage `allowed_users` table
4. **Token Encryption**: Encrypt Spotify tokens at rest
5. **Audit Logging**: Track login attempts and sensitive operations
6. **Invite System**: Allow premium users to invite others
