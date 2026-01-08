import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getAppUserBySpotifyId, getSpotifyPreferences, upsertSpotifyPreferences, checkPremiumStatus } from "./_shared/neon.ts";
import { checkRateLimit, rateLimitHeaders } from "./_shared/rateLimit.ts";
import { validateSpotifyUri, validateVolume, validateBoolean } from "./_shared/validation.ts";

export default async function handler(request: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Rate limiting
    const rateLimit = await checkRateLimit(request, "settings");
    const headers = rateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        return errorResponse("Too many requests", 429, "RATE_LIMITED", request, headers);
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

        // GET - Fetch preferences
        if (request.method === "GET") {
            const prefs = await getSpotifyPreferences(spotifyUserId);

            // Return defaults if no prefs exist
            return jsonResponse(prefs || {
                focus_playlist_uri: null,
                break_playlist_uri: null,
                auto_play_enabled: false,
                volume_focus: 50,
                volume_break: 70,
            }, request, 200, headers);
        }

        // POST - Update preferences
        if (request.method === "POST") {
            const body = await request.json();

            // Validate playlist URIs
            const focusUri = body.focus_playlist_uri
                ? validateSpotifyUri(body.focus_playlist_uri)
                : null;
            const breakUri = body.break_playlist_uri
                ? validateSpotifyUri(body.break_playlist_uri)
                : null;

            // Return error if URIs provided but invalid
            if (body.focus_playlist_uri && !focusUri) {
                return errorResponse("Invalid focus playlist URI format", 400, "INVALID_URI", request, headers);
            }
            if (body.break_playlist_uri && !breakUri) {
                return errorResponse("Invalid break playlist URI format", 400, "INVALID_URI", request, headers);
            }

            // Build validated preferences
            const prefs = {
                spotify_user_id: spotifyUserId,
                focus_playlist_uri: focusUri,
                break_playlist_uri: breakUri,
                auto_play_enabled: validateBoolean(body.auto_play_enabled, false),
                volume_focus: validateVolume(body.volume_focus, 50),
                volume_break: validateVolume(body.volume_break, 70),
            };

            await upsertSpotifyPreferences(prefs);

            return jsonResponse({ success: true }, request, 200, headers);
        }

        return errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED", request, headers);
    } catch (err) {
        console.error("[Settings] Error:", err);
        return errorResponse("Failed to process request", 500, "SERVER_ERROR", request, headers);
    }
}
