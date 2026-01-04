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

**Key Constraint**: The existing Spotify OAuth flow (via Netlify Edge Functions) remains unchanged. Site auth is separate and handled entirely by Supabase client-side.

---

## Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================
-- ALLOWED USERS (Premium whitelist)
-- ============================================
-- This table controls who can access Spotify features.
-- Add emails manually via Supabase dashboard or SQL.

CREATE TABLE IF NOT EXISTS allowed_users (
  email TEXT PRIMARY KEY,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT  -- Optional: reason for access, e.g., "beta tester", "friend"
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON allowed_users(email);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on allowed_users table
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to check if their own email exists
-- This prevents users from seeing the entire whitelist
CREATE POLICY "Users can check their own premium status"
  ON allowed_users
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- ============================================
-- SEED DATA (Optional - add your premium users)
-- ============================================
-- INSERT INTO allowed_users (email, notes) VALUES
--   ('your-email@example.com', 'Owner'),
--   ('friend@example.com', 'Beta tester');
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

---

## Phase 5: Backend Gatekeeper (Edge Function)

### 5.1 Update Spotify Callback

**File**: `netlify/edge-functions/spotify-callback.ts`

Add premium check before allowing Spotify connection:

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

  // Handle errors
  if (error) {
    console.error("[OAuth] Error from Spotify:", error);
    return redirectWithError("access_denied");
  }

  if (!code || !state || state !== storedState) {
    console.error("[OAuth] Invalid state or missing code");
    return redirectWithError("invalid_state");
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user profile from Spotify
    const user = await getCurrentUser(tokens.access_token);
    const spotifyEmail = user.email?.toLowerCase();

    // ============================================
    // PREMIUM GATEKEEPER CHECK
    // ============================================
    if (spotifyEmail) {
      const supabase = getSupabase();
      const { data: allowedUser, error: checkError } = await supabase
        .from("allowed_users")
        .select("is_active")
        .eq("email", spotifyEmail)
        .single();

      // If user is not in whitelist or not active, reject
      if (checkError || !allowedUser?.is_active) {
        console.warn(`[OAuth] Premium check failed for ${spotifyEmail}`);
        return redirectWithError("not_premium");
      }
    } else {
      // No email from Spotify = reject
      console.warn("[OAuth] No email returned from Spotify");
      return redirectWithError("no_email");
    }
    // ============================================

    // Calculate expiration timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

    // Upsert user in database
    const supabase = getSupabase();

    const { error: dbError } = await supabase.from("spotify_accounts").upsert({
      spotify_user_id: user.id,
      email: user.email,
      display_name: user.display_name,
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

    // Create session cookie
    const sessionCookie = await createSessionCookie(user.id);

    // Prepare response headers
    const headers = new Headers();
    headers.set("Location", "/?spotify=connected");
    headers.append("Set-Cookie", sessionCookie);
    headers.append("Set-Cookie", "spotify_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");

    // Redirect to home page with session
    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err) {
    console.error("[OAuth] Callback error:", err);
    return redirectWithError("server_error");
  }
}

function redirectWithError(error: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/?spotify_error=${error}`,
    },
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

### Database Setup
1. **Run SQL schema** in Supabase SQL Editor (Phase 1 SQL)
2. **Configure Supabase Auth** (Phase 6.1, 6.2)
3. **Add yourself to allowed_users** table for testing

### Frontend Auth
4. **Create `src/types/auth.ts`** (Phase 1.1)
5. **Create `src/lib/supabase.ts`** (Phase 1.2)
6. **Create `src/hooks/useSiteAuth.ts`** (Phase 2.1)
7. **Create `src/components/auth/LoginButton.tsx`** (Phase 3.1)
8. **Create `src/components/auth/LoginModal.tsx`** (Phase 3.2)
9. **Test Auth Flow**: Verify login/logout works

### Integration
10. **Update `Timer.tsx`** (Phase 4.1) - Add LoginButton, gate Spotify behind isPremium
11. **Update `useSpotifySync.ts`** (Phase 4.2) - Add premium safety check
12. **Test Premium Gating**: Verify non-premium users can't see Spotify controls

### Backend Gatekeeper
13. **Update `spotify-callback.ts`** (Phase 5.1) - Add whitelist check
14. **Test Full Flow**: Verify non-premium users are rejected at OAuth callback

---

## Testing Checklist

### Site Auth
- [ ] Visit site → see "Log in" button in header
- [ ] Click "Log in" → modal appears
- [ ] Enter email → receive magic link email
- [ ] Click magic link → redirected back, logged in
- [ ] Refresh page → still logged in
- [ ] Click "Log out" → logged out

### Premium Gating (Non-Premium User)
- [ ] Log in with email NOT in `allowed_users`
- [ ] Verify "Connect Spotify" button is hidden
- [ ] Verify no "Premium" badge shown

### Premium Gating (Premium User)
- [ ] Add your email to `allowed_users` table
- [ ] Log in with that email
- [ ] Verify "Premium" badge appears
- [ ] Verify "Connect Spotify" button appears
- [ ] Can connect Spotify and use Auto-DJ

### Backend Gatekeeper
- [ ] As non-premium user, manually navigate to `/api/spotify/login`
- [ ] Complete Spotify OAuth
- [ ] Verify redirect to `/?spotify_error=not_premium`

---

## Error Handling

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| `not_premium` | User email not in `allowed_users` | "Spotify features are only available to premium users." |
| `no_email` | Spotify didn't return an email | "Unable to verify your account. Please ensure your Spotify account has an email." |
| `access_denied` | User denied Spotify OAuth | "Spotify connection was cancelled." |
| `invalid_state` | CSRF check failed | "Session expired. Please try again." |
| `server_error` | Internal error | "Something went wrong. Please try again." |

---

## Security Notes

- **Row Level Security (RLS)**: Users can only query their own email in `allowed_users`
- **Backend enforcement**: Even if UI is bypassed, edge function rejects non-premium users
- **Magic Link expiry**: Links expire after 1 hour (configurable in Supabase)
- **No password storage**: Using passwordless auth (Magic Link)

---

## Future Enhancements (Out of Scope)

1. **Social Login**: Add Google/GitHub OAuth providers
2. **Premium Subscription**: Integrate Stripe for paid access
3. **Admin Dashboard**: UI to manage `allowed_users` table
4. **Invite System**: Allow premium users to invite others
