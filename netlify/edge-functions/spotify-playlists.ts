import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getAppUserBySpotifyId, checkPremiumStatus } from "./_shared/neon.ts";
import { getValidAccessToken, getUserPlaylists } from "./_shared/spotify.ts";
import { checkRateLimit, rateLimitHeaders } from "./_shared/rateLimit.ts";

export default async function handler(request: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Rate limiting
    const rateLimit = await checkRateLimit(request, "playlists");
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

        return jsonResponse({ playlists }, request, 200, headers);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";

        if (message === "NO_ACCOUNT" || message === "TOKEN_EXPIRED") {
            return errorResponse("Session expired, please reconnect Spotify", 401, message, request, headers);
        }

        console.error("[Playlists] Error:", err);
        return errorResponse("Failed to fetch playlists", 500, "SERVER_ERROR", request, headers);
    }
}
