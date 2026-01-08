import { getAuthUrl } from "./_shared/spotify.ts";
import { getAppUser, isUserAllowed } from "./_shared/neon.ts";
import { signState } from "./_shared/csrf.ts";
import { checkRateLimit, rateLimitHeaders } from "./_shared/rateLimit.ts";

export default async function handler(request: Request): Promise<Response> {
    // Rate limiting
    const rateLimit = await checkRateLimit(request, "login");
    if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                ...rateLimitHeaders(rateLimit),
            },
        });
    }

    try {
        const url = new URL(request.url);
        const siteUserId = url.searchParams.get("user_id");

        if (!siteUserId) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/?spotify_error=not_logged_in" },
            });
        }

        // 1. Verify Site User exists
        const siteUser = await getAppUser(siteUserId);

        if (!siteUser) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/?spotify_error=invalid_user" },
            });
        }

        // 2. Check Premium Status
        const isPremium = await isUserAllowed(siteUser.email);

        if (!isPremium) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/?spotify_error=not_premium" },
            });
        }

        // 3. Generate signed state with CSRF protection
        const state = await signState({
            csrf: crypto.randomUUID(),
            siteUserId: siteUser.id,
        });

        // Store state in cookie for verification on callback
        const authUrl = getAuthUrl(state);
        const isProduction = Deno.env.get("NETLIFY") === "true";
        const secureFlag = isProduction ? "; Secure" : "";

        return new Response(null, {
            status: 302,
            headers: {
                Location: authUrl,
                "Set-Cookie": `spotify_oauth_state=${encodeURIComponent(state)}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax${secureFlag}`,
                ...rateLimitHeaders(rateLimit),
            },
        });
    } catch (error) {
        console.error("[Login] Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
