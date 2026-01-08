import { exchangeCodeForTokens, getCurrentUser } from "./_shared/spotify.ts";
import { getAppUser, upsertSpotifyAccount, linkSpotifyToUser, isSpotifyLinkedToOther } from "./_shared/neon.ts";
import { createSessionCookie } from "./_shared/session.ts";
import { validateOAuthState } from "./_shared/csrf.ts";
import { checkRateLimit, rateLimitHeaders } from "./_shared/rateLimit.ts";

export default async function handler(request: Request): Promise<Response> {
    // Rate limiting
    const rateLimit = await checkRateLimit(request, "callback");
    if (!rateLimit.allowed) {
        return redirectWithError("rate_limited");
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Get stored state from cookie
    const cookies = request.headers.get("Cookie") || "";
    const storedStateMatch = cookies.match(/spotify_oauth_state=([^;]+)/);
    const storedState = storedStateMatch ? decodeURIComponent(storedStateMatch[1]) : null;

    // Handle errors from Spotify
    if (error) {
        console.error("[OAuth] Error from Spotify:", error);
        return redirectWithError("access_denied");
    }

    if (!code || !state) {
        console.error("[OAuth] Missing code or state");
        return redirectWithError("invalid_state");
    }

    // Verify CSRF state signature and expiration
    const stateData = await validateOAuthState(state, storedState);
    if (!stateData) {
        console.error("[OAuth] Invalid or expired state");
        return redirectWithError("invalid_state");
    }

    const { siteUserId } = stateData;

    try {
        // Verify site user exists
        const siteUser = await getAppUser(siteUserId);
        if (!siteUser) {
            return redirectWithError("invalid_user");
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);
        const spotifyUser = await getCurrentUser(tokens.access_token);

        // Check if Spotify account is already linked to a different user
        const isLinkedToOther = await isSpotifyLinkedToOther(spotifyUser.id, siteUser.id);
        if (isLinkedToOther) {
            return redirectWithError("spotify_already_linked");
        }

        // Calculate expiration timestamp
        const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

        // Upsert Spotify account with user link
        await upsertSpotifyAccount({
            user_id: siteUser.id,
            spotify_user_id: spotifyUser.id,
            email: spotifyUser.email,
            display_name: spotifyUser.display_name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
        });

        // Link Spotify to app user record
        await linkSpotifyToUser(siteUser.id, spotifyUser.id);

        // Create session cookie
        const sessionCookie = await createSessionCookie(spotifyUser.id);

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
