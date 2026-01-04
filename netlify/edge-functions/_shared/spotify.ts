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
    // Note: Race condition possible here if multiple requests try to refresh token simultaneously.
    // In a production app, we might want to use a distributed lock or queue.
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
    } catch (error) {
        console.warn("[Spotify] Failed to get playback state:", error);
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
    if (state.context?.uri === playlistUri) {
        if (!state.is_playing) {
            // Just resume
            await spotifyFetch(accessToken, "/me/player/play", {
                method: "PUT",
            });
        }
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
