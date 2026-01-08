import { handleCors, jsonResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getAppUserBySpotifyId, getSpotifyAccount, checkPremiumStatus } from "./_shared/neon.ts";
import { checkRateLimit, rateLimitHeaders } from "./_shared/rateLimit.ts";

export default async function handler(request: Request): Promise<Response> {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Rate limiting
    const rateLimit = await checkRateLimit(request, "session");
    const headers = rateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        return jsonResponse({ error: "Too many requests" }, request, 429, headers);
    }

    const spotifyUserId = await getSession(request);

    if (!spotifyUserId) {
        return jsonResponse({ authenticated: false }, request, 200, headers);
    }

    try {
        // Verify Premium Link - get app user by their spotify link
        const linkedUser = await getAppUserBySpotifyId(spotifyUserId);
        if (!linkedUser) {
            return jsonResponse({ authenticated: false }, request, 200, headers);
        }

        // Check if still premium
        const isPremium = await checkPremiumStatus(linkedUser.email);
        if (!isPremium) {
            return jsonResponse({ authenticated: false }, request, 200, headers);
        }

        // Get user info from spotify_accounts
        const account = await getSpotifyAccount(spotifyUserId);

        return jsonResponse({
            authenticated: true,
            user: account ? {
                displayName: account.display_name,
                email: account.email,
            } : null,
        }, request, 200, headers);
    } catch (error) {
        console.error("[Session] Error:", error);
        return jsonResponse({ authenticated: false }, request, 200, headers);
    }
}
