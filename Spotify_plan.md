# Pomodoro App: Spotify Auto-DJ Implementation Plan (v5 - Standalone Subdomain)

> **Goal**: Build a standalone Pomodoro timer at `pomodoro.vaishakmenon.com` with Spotify "Auto-DJ" integration.

---

## Architecture Overview

**Deployment**: Standalone repo → `pomodoro.vaishakmenon.com` (Netlify subdomain)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, static export) |
| Frontend Route | `/` (root - it's the whole app) |
| Backend | Netlify Edge Functions (Deno runtime) |
| Database | Supabase (PostgreSQL + REST API) |
| Auth | Custom OAuth flow via Edge Functions |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI (or your choice) |
| Animations | Framer Motion (optional) |
| State | React hooks + localStorage (timer) / Supabase (Spotify tokens) |

**Key Constraint**: Static export means no Next.js API routes. All backend logic goes in Netlify Edge Functions.

---

## Project Setup (New Repo)

### Create Next.js Project

```bash
npx create-next-app@latest pomodoro --typescript --tailwind --app --src-dir
cd pomodoro
```

### Configure for Static Export

**File**: `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
```

### Install Dependencies

```bash
# UI Components (choose one or both)
npm install @radix-ui/react-select @radix-ui/react-switch @radix-ui/react-slider

# Animations (optional)
npm install framer-motion

# Utilities
npm install clsx tailwind-merge
```

---

## Why NOT Auth.js?

Auth.js requires server-side session management that doesn't work with static export. Instead, we'll:
1. Handle OAuth manually via edge functions
2. Store tokens in Supabase (server-side, secure)
3. Use a session cookie to identify the user
4. Validate sessions in edge functions

---

## Dependencies to Install

```bash
# In your pomodoro repo (no backend deps needed - edge functions use Deno imports)
npm install @supabase/supabase-js  # Only if you want client-side Supabase access
```

---

## Environment Variables

Add to Netlify dashboard (Site Settings → Environment Variables):

```bash
# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="eyJ..."  # Service role key (NOT anon key)

# Spotify OAuth (from developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID="your_client_id"
SPOTIFY_CLIENT_SECRET="your_client_secret"
SPOTIFY_REDIRECT_URI="https://pomodoro.vaishakmenon.com/api/spotify/callback"

# Session encryption
SESSION_SECRET="generate-with-openssl-rand-base64-32"
```

**Spotify App Settings** (developer.spotify.com):
- Redirect URI: `https://pomodoro.vaishakmenon.com/api/spotify/callback`
- For local dev: also add `http://localhost:8888/api/spotify/callback`

---

## File Structure

```
pomodoro/                          # Standalone repo
├── netlify/
│   └── edge-functions/
│       ├── spotify-login.ts       # Initiate OAuth
│       ├── spotify-callback.ts    # Handle OAuth callback
│       ├── spotify-playlists.ts   # GET user playlists
│       ├── spotify-sync.ts        # POST playback control
│       ├── spotify-settings.ts    # GET/POST preferences
│       ├── spotify-session.ts     # Check auth status
│       ├── spotify-logout.ts      # Clear session
│       └── _shared/
│           ├── supabase.ts        # Supabase client
│           ├── spotify.ts         # Spotify API helpers
│           ├── session.ts         # Cookie session helpers
│           └── cors.ts            # CORS helpers
├── netlify.toml                   # Edge function routes + build config
├── next.config.ts                 # Static export config
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Main timer page (root route)
│   │   └── globals.css            # Tailwind imports
│   ├── components/
│   │   ├── timer/
│   │   │   ├── Timer.tsx          # Main timer component
│   │   │   ├── TimeDisplay.tsx    # Time display
│   │   │   ├── TimerControls.tsx  # Start/pause/reset buttons
│   │   │   └── PhaseTabs.tsx      # Study/short/long tabs
│   │   ├── spotify/
│   │   │   ├── SpotifyConnect.tsx # Login/logout button
│   │   │   └── MusicSettings.tsx  # Playlist picker + volume
│   │   └── ui/
│   │       └── ...                # Reusable UI components
│   ├── hooks/
│   │   ├── usePomodoroTimer.ts    # Timer logic
│   │   ├── useSpotifyAuth.ts      # Auth state hook
│   │   ├── useSpotifySync.ts      # Playback sync hook
│   │   └── useLocalStorage.ts     # Persistence helper
│   ├── lib/
│   │   ├── utils.ts               # cn() helper, etc.
│   │   └── time.ts                # Time formatting
│   ├── config/
│   │   └── timer.ts               # Timer durations, tabs
│   └── types/
│       ├── timer.ts               # Timer types
│       └── spotify.ts             # Spotify types
└── public/
    └── ...                        # Static assets (sounds, icons)
```

---

## Database Schema (Supabase)

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================
-- SPOTIFY ACCOUNTS (stores OAuth tokens)
-- ============================================
CREATE TABLE spotify_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,  -- Unix timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_spotify_accounts_user_id ON spotify_accounts(spotify_user_id);

-- ============================================
-- USER PREFERENCES (Auto-DJ settings)
-- ============================================
CREATE TABLE spotify_preferences (
  spotify_user_id TEXT PRIMARY KEY REFERENCES spotify_accounts(spotify_user_id) ON DELETE CASCADE,
  focus_playlist_uri TEXT,
  break_playlist_uri TEXT,
  auto_play_enabled BOOLEAN DEFAULT FALSE,
  volume_focus INTEGER DEFAULT 50 CHECK (volume_focus >= 0 AND volume_focus <= 100),
  volume_break INTEGER DEFAULT 70 CHECK (volume_break >= 0 AND volume_break <= 100),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALLOWED USERS (Gatekeeper - optional)
-- ============================================
-- Uncomment if you want invite-only access:
-- CREATE TABLE allowed_spotify_users (
--   email TEXT PRIMARY KEY,
--   is_active BOOLEAN DEFAULT TRUE,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spotify_accounts_updated_at
  BEFORE UPDATE ON spotify_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER spotify_preferences_updated_at
  BEFORE UPDATE ON spotify_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Phase 1: Edge Function Shared Utilities

### 1.1 CORS Helper

**File**: `netlify/edge-functions/_shared/cors.ts`

```typescript
// Standard CORS headers for edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function handleCors(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(message: string, status = 500, code?: string): Response {
  return jsonResponse({ error: message, code }, status);
}
```

### 1.2 Supabase Client

**File**: `netlify/edge-functions/_shared/supabase.ts`

```typescript
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_KEY");

    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================
// Database Types
// ============================================
export interface SpotifyAccount {
  id: string;
  spotify_user_id: string;
  email: string | null;
  display_name: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
}

export interface SpotifyPreferences {
  spotify_user_id: string;
  focus_playlist_uri: string | null;
  break_playlist_uri: string | null;
  auto_play_enabled: boolean;
  volume_focus: number;
  volume_break: number;
  updated_at: string;
}
```

### 1.3 Session Helper (Cookie-based)

**File**: `netlify/edge-functions/_shared/session.ts`

```typescript
// Simple signed cookie session
// Stores spotify_user_id in a signed cookie

const COOKIE_NAME = "pomodoro_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = Deno.env.get("SESSION_SECRET");
  if (!secret) throw new Error("Missing SESSION_SECRET");
  return secret;
}

// Create HMAC signature
async function sign(value: string): Promise<string> {
  const secret = getSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${value}.${signatureBase64}`;
}

// Verify HMAC signature
async function verify(signedValue: string): Promise<string | null> {
  const [value, signature] = signedValue.split(".");
  if (!value || !signature) return null;

  const expected = await sign(value);
  if (expected !== signedValue) return null;

  return value;
}

// Get session from request cookies
export async function getSession(request: Request): Promise<string | null> {
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  const signedValue = decodeURIComponent(match[1]);
  return verify(signedValue);
}

// Create Set-Cookie header for session
export async function createSessionCookie(spotifyUserId: string): Promise<string> {
  const signedValue = await sign(spotifyUserId);
  const isProduction = Deno.env.get("NETLIFY") === "true";

  return [
    `${COOKIE_NAME}=${encodeURIComponent(signedValue)}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    isProduction ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

// Create cookie to delete session
export function deleteSessionCookie(): string {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/`;
}
```

### 1.4 Spotify API Helper

**File**: `netlify/edge-functions/_shared/spotify.ts`

```typescript
import { getSupabase, type SpotifyAccount } from "./supabase.ts";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";

// Scopes needed for Auto-DJ
export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

// ============================================
// OAuth Helpers
// ============================================

export function getAuthUrl(state: string): string {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const redirectUri = Deno.env.get("SPOTIFY_REDIRECT_URI");

  if (!clientId || !redirectUri) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
  });

  return `${SPOTIFY_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
  const redirectUri = Deno.env.get("SPOTIFY_REDIRECT_URI")!;

  // Deno doesn't have Buffer, use btoa for base64
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Spotify] Token exchange failed:", error);
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json();
}

// ============================================
// Token Refresh
// ============================================

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Spotify] Token refresh failed:", error);
    throw new Error("TOKEN_EXPIRED");
  }

  return response.json();
}

// ============================================
// Get Valid Access Token (with auto-refresh)
// ============================================

export async function getValidAccessToken(spotifyUserId: string): Promise<string> {
  const supabase = getSupabase();

  const { data: account, error } = await supabase
    .from("spotify_accounts")
    .select("*")
    .eq("spotify_user_id", spotifyUserId)
    .single();

  if (error || !account) {
    throw new Error("NO_ACCOUNT");
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = now >= account.expires_at - 300; // 5 min buffer

  if (!isExpired) {
    return account.access_token;
  }

  // Refresh the token
  console.log(`[Spotify] Refreshing token for ${spotifyUserId}`);

  const tokens = await refreshAccessToken(account.refresh_token);
  const newExpiresAt = now + tokens.expires_in;

  // Update database
  await supabase
    .from("spotify_accounts")
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt,
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
    })
    .eq("spotify_user_id", spotifyUserId);

  return tokens.access_token;
}

// ============================================
// Spotify API Calls
// ============================================

async function spotifyFetch<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.error?.message || "Spotify API error";
    throw new Error(`SPOTIFY_ERROR:${response.status}:${message}`);
  }

  return response.json();
}

// Get current user profile
export async function getCurrentUser(accessToken: string): Promise<{
  id: string;
  email: string;
  display_name: string;
}> {
  return spotifyFetch(accessToken, "/me");
}

// Get user's playlists
export async function getUserPlaylists(accessToken: string, limit = 50): Promise<{
  items: Array<{
    id: string;
    name: string;
    uri: string;
    images: Array<{ url: string }>;
    tracks: { total: number };
    owner: { display_name: string };
  }>;
}> {
  return spotifyFetch(accessToken, `/me/playlists?limit=${limit}`);
}

// Get playback state
export async function getPlaybackState(accessToken: string): Promise<{
  is_playing: boolean;
  device: { id: string; volume_percent: number } | null;
  context: { uri: string } | null;
} | null> {
  try {
    return await spotifyFetch(accessToken, "/me/player");
  } catch {
    return null;
  }
}

// Start playback
export async function startPlayback(
  accessToken: string,
  playlistUri: string
): Promise<void> {
  const state = await getPlaybackState(accessToken);

  if (!state?.device) {
    throw new Error("NO_DEVICE");
  }

  // Already playing this playlist?
  if (state.is_playing && state.context?.uri === playlistUri) {
    return;
  }

  await spotifyFetch(accessToken, "/me/player/play", {
    method: "PUT",
    body: JSON.stringify({ context_uri: playlistUri }),
  });
}

// Pause playback
export async function pausePlayback(accessToken: string): Promise<void> {
  const state = await getPlaybackState(accessToken);

  if (!state?.is_playing) {
    return;
  }

  await spotifyFetch(accessToken, "/me/player/pause", {
    method: "PUT",
  });
}

// Set volume
export async function setVolume(
  accessToken: string,
  volumePercent: number
): Promise<void> {
  const volume = Math.max(0, Math.min(100, Math.round(volumePercent)));
  await spotifyFetch(accessToken, `/me/player/volume?volume_percent=${volume}`, {
    method: "PUT",
  });
}
```

---

## Phase 2: OAuth Edge Functions

### 2.1 Login (Initiate OAuth)

**File**: `netlify/edge-functions/spotify-login.ts`

```typescript
import { getAuthUrl } from "./_shared/spotify.ts";

export default async function handler(request: Request): Promise<Response> {
  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie for verification on callback
  const authUrl = getAuthUrl(state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
      "Set-Cookie": `spotify_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`,
    },
  });
}
```

### 2.2 Callback (Handle OAuth Response)

**File**: `netlify/edge-functions/spotify-callback.ts`

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

    // Get user profile
    const user = await getCurrentUser(tokens.access_token);

    // Calculate expiration timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

    // Upsert user in database
    const supabase = getSupabase();

    await supabase.from("spotify_accounts").upsert({
      spotify_user_id: user.id,
      email: user.email,
      display_name: user.display_name,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    }, {
      onConflict: "spotify_user_id",
    });

    // Create session cookie
    const sessionCookie = await createSessionCookie(user.id);

    // Redirect to home page with session
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/?spotify=connected",
        "Set-Cookie": [
          sessionCookie,
          "spotify_oauth_state=; Max-Age=0; Path=/", // Clear state cookie
        ].join(", "),
      },
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

## Phase 3: API Edge Functions

### 3.1 Get Playlists

**File**: `netlify/edge-functions/spotify-playlists.ts`

```typescript
import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getValidAccessToken, getUserPlaylists } from "./_shared/spotify.ts";

export default async function handler(request: Request): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Get session
  const spotifyUserId = await getSession(request);
  if (!spotifyUserId) {
    return errorResponse("Unauthorized", 401, "NO_SESSION");
  }

  try {
    const accessToken = await getValidAccessToken(spotifyUserId);
    const data = await getUserPlaylists(accessToken);

    // Simplify response
    const playlists = data.items.map((p) => ({
      uri: p.uri,
      name: p.name,
      imageUrl: p.images[0]?.url ?? null,
      trackCount: p.tracks.total,
      owner: p.owner.display_name,
    }));

    return jsonResponse({ playlists });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "NO_ACCOUNT" || message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired, please reconnect Spotify", 401, message);
    }

    console.error("[Playlists] Error:", err);
    return errorResponse("Failed to fetch playlists", 500);
  }
}
```

### 3.2 Sync Playback (Auto-DJ Core)

**File**: `netlify/edge-functions/spotify-sync.ts`

```typescript
import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getSupabase } from "./_shared/supabase.ts";
import {
  getValidAccessToken,
  startPlayback,
  pausePlayback,
  setVolume,
} from "./_shared/spotify.ts";

type TimerState = "FOCUS" | "BREAK" | "PAUSED";

export default async function handler(request: Request): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // Get session
  const spotifyUserId = await getSession(request);
  if (!spotifyUserId) {
    return errorResponse("Unauthorized", 401, "NO_SESSION");
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const state = body.state as TimerState;

    if (!["FOCUS", "BREAK", "PAUSED"].includes(state)) {
      return errorResponse("Invalid state", 400, "INVALID_STATE");
    }

    // Get user preferences
    const supabase = getSupabase();
    const { data: prefs } = await supabase
      .from("spotify_preferences")
      .select("*")
      .eq("spotify_user_id", spotifyUserId)
      .single();

    // Skip if auto-play not enabled
    if (!prefs || !prefs.auto_play_enabled) {
      return jsonResponse({ success: true, skipped: true, reason: "Auto-play not enabled" });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(spotifyUserId);

    // Execute playback control
    switch (state) {
      case "FOCUS":
        if (prefs.focus_playlist_uri) {
          await setVolume(accessToken, prefs.volume_focus);
          await startPlayback(accessToken, prefs.focus_playlist_uri);
        }
        break;

      case "BREAK":
        if (prefs.break_playlist_uri) {
          await setVolume(accessToken, prefs.volume_break);
          await startPlayback(accessToken, prefs.break_playlist_uri);
        } else {
          await pausePlayback(accessToken);
        }
        break;

      case "PAUSED":
        await pausePlayback(accessToken);
        break;
    }

    return jsonResponse({ success: true, state });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "NO_DEVICE") {
      return errorResponse(
        "No active Spotify device. Open Spotify and try again.",
        404,
        "NO_DEVICE"
      );
    }

    if (message === "NO_ACCOUNT" || message === "TOKEN_EXPIRED") {
      return errorResponse("Session expired, please reconnect Spotify", 401, message);
    }

    if (message.startsWith("SPOTIFY_ERROR:")) {
      const [, status, spotifyMessage] = message.split(":");
      return errorResponse(spotifyMessage || "Spotify error", parseInt(status) || 500);
    }

    console.error("[Sync] Error:", err);
    return errorResponse("Sync failed", 500);
  }
}
```

### 3.3 User Settings

**File**: `netlify/edge-functions/spotify-settings.ts`

```typescript
import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getSupabase } from "./_shared/supabase.ts";

export default async function handler(request: Request): Promise<Response> {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Get session
  const spotifyUserId = await getSession(request);
  if (!spotifyUserId) {
    return errorResponse("Unauthorized", 401, "NO_SESSION");
  }

  const supabase = getSupabase();

  // GET - Fetch preferences
  if (request.method === "GET") {
    const { data: prefs } = await supabase
      .from("spotify_preferences")
      .select("*")
      .eq("spotify_user_id", spotifyUserId)
      .single();

    // Return defaults if no prefs exist
    return jsonResponse(prefs || {
      focus_playlist_uri: null,
      break_playlist_uri: null,
      auto_play_enabled: false,
      volume_focus: 50,
      volume_break: 70,
    });
  }

  // POST - Update preferences
  if (request.method === "POST") {
    try {
      const body = await request.json();

      // Validate
      const prefs = {
        spotify_user_id: spotifyUserId,
        focus_playlist_uri: body.focus_playlist_uri ?? null,
        break_playlist_uri: body.break_playlist_uri ?? null,
        auto_play_enabled: Boolean(body.auto_play_enabled),
        volume_focus: Math.max(0, Math.min(100, Number(body.volume_focus) || 50)),
        volume_break: Math.max(0, Math.min(100, Number(body.volume_break) || 70)),
      };

      await supabase.from("spotify_preferences").upsert(prefs, {
        onConflict: "spotify_user_id",
      });

      return jsonResponse({ success: true });
    } catch (err) {
      console.error("[Settings] Error:", err);
      return errorResponse("Failed to save settings", 500);
    }
  }

  return errorResponse("Method not allowed", 405);
}
```

### 3.4 Session Status (Check if logged in)

**File**: `netlify/edge-functions/spotify-session.ts`

```typescript
import { handleCors, jsonResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getSupabase } from "./_shared/supabase.ts";

export default async function handler(request: Request): Promise<Response> {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const spotifyUserId = await getSession(request);

  if (!spotifyUserId) {
    return jsonResponse({ authenticated: false });
  }

  // Get user info from database
  const supabase = getSupabase();
  const { data: account } = await supabase
    .from("spotify_accounts")
    .select("display_name, email")
    .eq("spotify_user_id", spotifyUserId)
    .single();

  return jsonResponse({
    authenticated: true,
    user: account ? {
      displayName: account.display_name,
      email: account.email,
    } : null,
  });
}
```

### 3.5 Logout

**File**: `netlify/edge-functions/spotify-logout.ts`

```typescript
import { deleteSessionCookie } from "./_shared/session.ts";

export default async function handler(): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": deleteSessionCookie(),
    },
  });
}
```

---

## Phase 4: Create netlify.toml

**File**: `netlify.toml` (project root)

```toml
[build]
  command = "npm run build"
  publish = "out"

# Spotify Edge Functions
[[edge_functions]]
  path = "/api/spotify/login"
  function = "spotify-login"

[[edge_functions]]
  path = "/api/spotify/callback"
  function = "spotify-callback"

[[edge_functions]]
  path = "/api/spotify/playlists"
  function = "spotify-playlists"

[[edge_functions]]
  path = "/api/spotify/sync"
  function = "spotify-sync"

[[edge_functions]]
  path = "/api/spotify/settings"
  function = "spotify-settings"

[[edge_functions]]
  path = "/api/spotify/session"
  function = "spotify-session"

[[edge_functions]]
  path = "/api/spotify/logout"
  function = "spotify-logout"

# Headers for security
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Phase 5: Frontend Components

### 5.1 Spotify Types (Frontend)

**File**: `src/types/spotify.ts`

```typescript
export type TimerState = "FOCUS" | "BREAK" | "PAUSED";

export interface SpotifyUser {
  displayName: string | null;
  email: string | null;
}

export interface SpotifySession {
  authenticated: boolean;
  user: SpotifyUser | null;
}

export interface Playlist {
  uri: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  owner: string;
}

export interface SpotifyPreferences {
  focus_playlist_uri: string | null;
  break_playlist_uri: string | null;
  auto_play_enabled: boolean;
  volume_focus: number;
  volume_break: number;
}
```

### 5.2 Spotify Auth Hook

**File**: `src/hooks/useSpotifyAuth.ts`

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type { SpotifySession } from "@/types/spotify";

export function useSpotifyAuth() {
  const [session, setSession] = useState<SpotifySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    fetch("/api/spotify/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setSession(data))
      .catch(() => setSession({ authenticated: false, user: null }))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(() => {
    // Redirect to OAuth flow
    window.location.href = "/api/spotify/login";
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/spotify/logout";
  }, []);

  return {
    session,
    isLoading,
    isAuthenticated: session?.authenticated ?? false,
    user: session?.user ?? null,
    login,
    logout,
  };
}
```

### 5.3 Spotify Sync Hook

**File**: `src/hooks/useSpotifySync.ts`

```typescript
"use client";

import { useCallback, useRef, useEffect } from "react";
import { useSpotifyAuth } from "./useSpotifyAuth";
import type { TimerState } from "@/types/spotify";

interface UseSpotifySyncOptions {
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Callback when sync fails */
  onError?: (error: string, code?: string) => void;
}

export function useSpotifySync(options: UseSpotifySyncOptions = {}) {
  const { debounceMs = 500, onError } = options;
  const { isAuthenticated } = useSpotifyAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStateRef = useRef<TimerState | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const syncPlayback = useCallback(
    (state: TimerState) => {
      // Skip if not authenticated
      if (!isAuthenticated) {
        return;
      }

      // Debounce: clear any pending sync
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Skip if state hasn't changed
      if (lastStateRef.current === state) {
        return;
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          lastStateRef.current = state;

          const response = await fetch("/api/spotify/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state }),
            credentials: "include",
          });

          if (!response.ok) {
            const data = await response.json();
            console.error("[SpotifySync] Error:", data);
            onError?.(data.error, data.code);
          }
        } catch (error) {
          console.error("[SpotifySync] Network error:", error);
          onError?.("Network error");
        }
      }, debounceMs);
    },
    [isAuthenticated, debounceMs, onError]
  );

  return {
    syncPlayback,
    isAuthenticated,
  };
}
```

### 5.4 Spotify Connect Button

**File**: `src/components/spotify/SpotifyConnect.tsx`

```tsx
"use client";

import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";

export function SpotifyConnect() {
  const { isAuthenticated, isLoading, user, login, logout } = useSpotifyAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Checking Spotify...
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm">{user.displayName || "Connected"}</span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full font-medium transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      Connect Spotify
    </button>
  );
}
```

### 5.5 Music Settings Component

**File**: `src/components/spotify/MusicSettings.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import type { Playlist, SpotifyPreferences } from "@/types/spotify";

export function MusicSettings() {
  const { isAuthenticated, isLoading: authLoading, login } = useSpotifyAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [preferences, setPreferences] = useState<SpotifyPreferences>({
    focus_playlist_uri: null,
    break_playlist_uri: null,
    auto_play_enabled: false,
    volume_focus: 50,
    volume_break: 70,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Fetch playlists and preferences
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/spotify/playlists", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/spotify/settings", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([playlistData, prefsData]) => {
        setPlaylists(playlistData.playlists || []);
        if (prefsData && !prefsData.error) {
          setPreferences(prefsData);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch("/api/spotify/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Save failed");

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">
          Connect Spotify to enable Auto-DJ
        </p>
        <button
          onClick={login}
          className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full font-medium transition-colors"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold">Music Settings</h2>

      {/* Auto-DJ Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={preferences.auto_play_enabled}
          onChange={(e) =>
            setPreferences((p) => ({ ...p, auto_play_enabled: e.target.checked }))
          }
          className="w-5 h-5 rounded"
        />
        <span>Enable Auto-DJ</span>
      </label>

      {preferences.auto_play_enabled && (
        <>
          {/* Focus Playlist */}
          <div className="space-y-2">
            <label className="block font-medium">Focus Playlist</label>
            <select
              value={preferences.focus_playlist_uri || ""}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  focus_playlist_uri: e.target.value || null,
                }))
              }
              className="w-full p-2 border rounded bg-background"
            >
              <option value="">Select a playlist</option>
              {playlists.map((p) => (
                <option key={p.uri} value={p.uri}>
                  {p.name} ({p.trackCount} tracks)
                </option>
              ))}
            </select>
          </div>

          {/* Break Playlist */}
          <div className="space-y-2">
            <label className="block font-medium">Break Playlist</label>
            <select
              value={preferences.break_playlist_uri || ""}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  break_playlist_uri: e.target.value || null,
                }))
              }
              className="w-full p-2 border rounded bg-background"
            >
              <option value="">None (pause during break)</option>
              {playlists.map((p) => (
                <option key={p.uri} value={p.uri}>
                  {p.name} ({p.trackCount} tracks)
                </option>
              ))}
            </select>
          </div>

          {/* Volume Sliders */}
          <div className="space-y-2">
            <label className="block font-medium">
              Focus Volume: {preferences.volume_focus}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.volume_focus}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  volume_focus: Number(e.target.value),
                }))
              }
              className="w-full accent-[#1DB954]"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-medium">
              Break Volume: {preferences.volume_break}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.volume_break}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  volume_break: Number(e.target.value),
                }))
              }
              className="w-full accent-[#1DB954]"
            />
          </div>
        </>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`w-full py-2 rounded font-medium transition-colors ${
          saveStatus === "success"
            ? "bg-green-500 text-white"
            : saveStatus === "error"
            ? "bg-red-500 text-white"
            : "bg-[#1DB954] hover:bg-[#1ed760] text-white"
        } disabled:opacity-50`}
      >
        {isSaving
          ? "Saving..."
          : saveStatus === "success"
          ? "Saved!"
          : saveStatus === "error"
          ? "Error - Try Again"
          : "Save Settings"}
      </button>
    </div>
  );
}
```

### 5.6 Integrate Sync with Timer

**Update your existing `usePomodoroTimer.ts`** - Add these changes:

```typescript
// Add at the top of the hook:
const syncRef = useRef<((state: "FOCUS" | "BREAK" | "PAUSED") => void) | null>(null);

// Add this function inside the hook:
const setSyncCallback = useCallback((cb: ((state: "FOCUS" | "BREAK" | "PAUSED") => void) | null) => {
  syncRef.current = cb;
}, []);

// Modify the start() function:
const start = () => {
  setIsRunning(true);
  syncRef.current?.(tab === "study" ? "FOCUS" : "BREAK");
};

// Modify the pause() function:
const pause = () => {
  setIsRunning(false);
  syncRef.current?.("PAUSED");
};

// In the phase transition logic (inside setSecondsLeft callback in the interval):
// After setTab(next), add:
syncRef.current?.(next === "study" ? "FOCUS" : "BREAK");

// Add to the return object:
return {
  // ... existing properties
  setSyncCallback,
};
```

### 5.7 Timer Component with Spotify

**File**: `src/components/timer/Timer.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { useSpotifySync } from "@/hooks/useSpotifySync";
import { SpotifyConnect } from "@/components/spotify/SpotifyConnect";
// ... your other imports

export function PomodoroTimer() {
  const timer = usePomodoroTimer({
    onComplete: (prevTab) => {
      // Play chime, etc.
    },
  });

  const { syncPlayback, isAuthenticated } = useSpotifySync({
    onError: (error, code) => {
      if (code === "NO_DEVICE") {
        // Show toast: "Open Spotify on a device"
        console.warn("No active Spotify device");
      }
    },
  });

  // Connect sync to timer
  useEffect(() => {
    if (isAuthenticated) {
      timer.setSyncCallback(syncPlayback);
    } else {
      timer.setSyncCallback(null);
    }
  }, [isAuthenticated, syncPlayback, timer.setSyncCallback]);

  return (
    <div className="space-y-8">
      {/* Spotify Connection Status */}
      <div className="flex justify-center">
        <SpotifyConnect />
      </div>

      {/* Your existing timer UI */}
      {/* ... */}
    </div>
  );
}
```

---

## Phase 6: Testing Checklist

### Local Development Setup

1. **Install Netlify CLI** (if not already):
   ```bash
   npm install -g netlify-cli
   ```

2. **Set local environment variables** - Create `.env` in your website repo:
   ```bash
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_KEY="your-service-key"
   SPOTIFY_CLIENT_ID="your-client-id"
   SPOTIFY_CLIENT_SECRET="your-client-secret"
   SPOTIFY_REDIRECT_URI="http://localhost:8888/api/spotify/callback"
   SESSION_SECRET="any-random-32-char-string-for-dev"
   ```

3. **Run with Netlify Dev**:
   ```bash
   netlify dev
   ```
   This serves your site at `http://localhost:8888` with edge functions working.

### Manual Testing Steps

1. **Auth Flow**
   - [ ] Visit `/`, click "Connect Spotify"
   - [ ] Verify redirect to Spotify OAuth consent screen
   - [ ] After consent, verify redirect back to `/?spotify=connected`
   - [ ] Verify session cookie is set (check DevTools → Application → Cookies)
   - [ ] Refresh page → should still show as connected

2. **Session Persistence**
   - [ ] Close browser, reopen → should still be logged in
   - [ ] Click "Disconnect" → should clear session
   - [ ] Verify session cookie is removed

3. **Playlist Fetching**
   - [ ] Open Music Settings
   - [ ] Verify playlists load in dropdown
   - [ ] Check that private playlists appear
   - [ ] Verify playlist images load (if available)

4. **Settings Persistence**
   - [ ] Enable Auto-DJ, select playlists, adjust volumes
   - [ ] Click Save → should show success
   - [ ] Refresh page → settings should persist
   - [ ] Check Supabase → `spotify_preferences` table should have your data

5. **Auto-DJ Playback**
   - [ ] Open Spotify on a device (phone, desktop, web player)
   - [ ] Enable Auto-DJ, select Focus playlist
   - [ ] Start timer → Spotify should start playing
   - [ ] Pause timer → Spotify should pause
   - [ ] Let timer complete → should switch to Break playlist (or pause)

6. **Edge Cases**
   - [ ] Test with no active Spotify device → should show "NO_DEVICE" error
   - [ ] Test token refresh: wait >1 hour, then trigger sync → should auto-refresh
   - [ ] Test with Spotify Free account → playback should work, volume may not

---

## Implementation Order for AI Agent

Execute in this exact sequence:

### Project Setup
1. **Create Next.js project** with static export (see Project Setup section)
2. **Install dependencies** (Radix UI, Framer Motion, etc.)
3. **Create `netlify.toml`** (Phase 4)
4. **Create `next.config.ts`** for static export

### Database
5. **Run SQL schema** in Supabase SQL Editor

### Edge Functions (Backend)
6. **Phase 1.1**: Create `netlify/edge-functions/_shared/cors.ts`
7. **Phase 1.2**: Create `netlify/edge-functions/_shared/supabase.ts`
8. **Phase 1.3**: Create `netlify/edge-functions/_shared/session.ts`
9. **Phase 1.4**: Create `netlify/edge-functions/_shared/spotify.ts`
10. **Phase 2.1**: Create `spotify-login.ts`
11. **Phase 2.2**: Create `spotify-callback.ts`
12. **Phase 3.4**: Create `spotify-session.ts`
13. **Phase 3.5**: Create `spotify-logout.ts`
14. **Test Auth Flow**: Run `netlify dev`, verify login/logout works

### Spotify Frontend
15. **Phase 5.1**: Create `src/types/spotify.ts`
16. **Phase 5.2**: Create `src/hooks/useSpotifyAuth.ts`
17. **Phase 5.4**: Create `src/components/spotify/SpotifyConnect.tsx`
18. **Test Auth UI**: Verify connect/disconnect buttons work

### Timer (Copy from existing repo or create new)
19. Create `src/config/timer.ts` (durations, tabs)
20. Create `src/types/timer.ts` (timer types)
21. Create `src/hooks/usePomodoroTimer.ts` (timer logic)
22. Create `src/components/timer/Timer.tsx` (main component)
23. Create `src/components/timer/TimeDisplay.tsx`
24. Create `src/components/timer/TimerControls.tsx`

### API + Settings
25. **Phase 3.1**: Create `spotify-playlists.ts`
26. **Phase 3.3**: Create `spotify-settings.ts`
27. **Phase 5.5**: Create `src/components/spotify/MusicSettings.tsx`
28. **Test Settings**: Verify playlist loading and saving

### Auto-DJ Integration
29. **Phase 3.2**: Create `spotify-sync.ts`
30. **Phase 5.3**: Create `src/hooks/useSpotifySync.ts`
31. **Phase 5.6**: Update `usePomodoroTimer.ts` with sync callback
32. **Phase 5.7**: Update Timer component with Spotify integration
33. **Test Auto-DJ**: Full end-to-end test

### Deploy
34. **Push to GitHub**
35. **Connect to Netlify** as new site
36. **Set environment variables** in Netlify dashboard
37. **Configure custom domain**: `pomodoro.vaishakmenon.com`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid redirect_uri" | Add exact URI to Spotify app: `https://pomodoro.vaishakmenon.com/api/spotify/callback` AND `http://localhost:8888/api/spotify/callback` |
| Edge function 404 | Check `netlify.toml` has correct path mappings |
| CORS errors | Ensure `credentials: "include"` in fetch calls and CORS headers in edge functions |
| "NO_SESSION" errors | Check cookies are being set (SameSite, Secure flags). Use `credentials: "include"` |
| Token refresh fails | Verify `SPOTIFY_CLIENT_SECRET` is set in Netlify env vars |
| "No active device" | User must have Spotify open on a device before triggering playback |
| Playlists empty | Verify `playlist-read-private` scope is included in `SPOTIFY_SCOPES` |
| Volume not changing | Spotify Premium required. Free accounts can't control volume via API |
| Session lost on refresh | Check SESSION_SECRET is consistent across deployments |
| Edge function timeout | Spotify API calls should be fast (<50ms). If slow, check token refresh logic |

---

## Spotify App Configuration

Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard):

1. Create a new app (or use existing)
2. **App Name**: "Pomodoro Timer" (or whatever you want)
3. **Redirect URIs** - Add both:
   - `https://pomodoro.vaishakmenon.com/api/spotify/callback`
   - `http://localhost:8888/api/spotify/callback`
4. **APIs used**: Web API
5. Copy **Client ID** and **Client Secret** to your env vars

---

## Security Notes

- **Never expose `SPOTIFY_CLIENT_SECRET`** - only use in edge functions
- **Service key stays server-side** - `SUPABASE_SERVICE_KEY` is only used in edge functions
- **Session cookies are HttpOnly** - Can't be read by JavaScript
- **HMAC-signed sessions** - Prevents tampering with session cookie
- **Token refresh is automatic** - Users don't need to re-auth every hour

---

## Future Enhancements (Out of Scope)

These are not included in this plan but could be added later:

1. **Invite-only access** - Uncomment the `allowed_spotify_users` table and add gatekeeper logic
2. **"Now Playing" widget** - Show current track from Spotify in the timer UI
3. **Ambient sounds + Spotify** - Layer ambient sounds on top of Spotify playback
4. **Cross-device sync** - Sync timer state across devices via Supabase realtime
5. **Analytics** - Track focus sessions, most-used playlists, etc.
