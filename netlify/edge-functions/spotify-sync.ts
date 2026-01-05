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

    // Verify Premium Link
    const supabase = getSupabase();
    const { data: linkedUser } = await supabase
        .from("users")
        .select("email")
        .eq("spotify_user_id", spotifyUserId)
        .single();

    if (!linkedUser) {
        return errorResponse("Spotify account not linked", 401, "NOT_LINKED");
    }

    const { data: isPremium } = await supabase
        .from("allowed_users")
        .select("is_active")
        .eq("email", linkedUser.email.toLowerCase())
        .single();

    if (!isPremium?.is_active) {
        return errorResponse("Premium access revoked", 403, "NOT_PREMIUM");
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
                    // Start playback first to ensure active device (avoids 404 from setVolume)
                    await startPlayback(accessToken, prefs.focus_playlist_uri);
                    await setVolume(accessToken, prefs.volume_focus);
                } else {
                    // No focus playlist set, just ensure volume is correct if playing, or do nothing?
                    // Review says: "FOCUS with no playlist does nothing silently".
                    // Let's log it or return info.
                    return jsonResponse({ success: true, skipped: true, reason: "No focus playlist set" });
                }
                break;

            case "BREAK":
                if (prefs.break_playlist_uri) {
                    await startPlayback(accessToken, prefs.break_playlist_uri);
                    await setVolume(accessToken, prefs.volume_break);
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
