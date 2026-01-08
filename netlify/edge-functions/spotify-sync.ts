import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getAppUserBySpotifyId, getSpotifyPreferences, checkPremiumStatus } from "./_shared/neon.ts";
import {
    getValidAccessToken,
    startPlayback,
    pausePlayback,
    setVolume,
} from "./_shared/spotify.ts";
import { checkRateLimit, rateLimitHeaders } from "./_shared/rateLimit.ts";
import { validateTimerState, type TimerState } from "./_shared/validation.ts";

export default async function handler(request: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Rate limiting
    const rateLimit = await checkRateLimit(request, "sync");
    const headers = rateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        return errorResponse("Too many requests", 429, "RATE_LIMITED", request, headers);
    }

    if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED", request, headers);
    }

    // Get session
    const spotifyUserId = await getSession(request);
    if (!spotifyUserId) {
        return errorResponse("Unauthorized", 401, "NO_SESSION", request, headers);
    }

    try {
        // Verify Premium Link
        const linkedUser = await getAppUserBySpotifyId(spotifyUserId);
        if (!linkedUser) {
            return errorResponse("Spotify account not linked", 401, "NOT_LINKED", request, headers);
        }

        const isPremium = await checkPremiumStatus(linkedUser.email);
        if (!isPremium) {
            return errorResponse("Premium access revoked", 403, "NOT_PREMIUM", request, headers);
        }

        // Parse and validate request body
        const body = await request.json();
        const state = validateTimerState(body.state);

        if (!state) {
            return errorResponse("Invalid state", 400, "INVALID_STATE", request, headers);
        }

        // Get user preferences
        const prefs = await getSpotifyPreferences(spotifyUserId);

        // Skip if auto-play not enabled
        if (!prefs || !prefs.auto_play_enabled) {
            return jsonResponse({ success: true, skipped: true, reason: "Auto-play not enabled" }, request, 200, headers);
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
                    return jsonResponse({ success: true, skipped: true, reason: "No focus playlist set" }, request, 200, headers);
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

        return jsonResponse({ success: true, state }, request, 200, headers);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";

        if (message === "NO_DEVICE") {
            return errorResponse(
                "No active Spotify device. Open Spotify and try again.",
                404,
                "NO_DEVICE",
                request,
                headers
            );
        }

        if (message === "NO_ACCOUNT" || message === "TOKEN_EXPIRED") {
            return errorResponse("Session expired, please reconnect Spotify", 401, message, request, headers);
        }

        if (message.startsWith("SPOTIFY_ERROR:")) {
            const [, status, spotifyMessage] = message.split(":");
            return errorResponse(spotifyMessage || "Spotify error", parseInt(status) || 500, "SPOTIFY_ERROR", request, headers);
        }

        console.error("[Sync] Error:", err);
        return errorResponse("Sync failed", 500, "SERVER_ERROR", request, headers);
    }
}
