import { getAuthUrl } from "./_shared/spotify.ts";

export default async function handler(request: Request): Promise<Response> {
    try {
        // Generate random state for CSRF protection
        const state = crypto.randomUUID();

        // Store state in cookie for verification on callback
        const authUrl = getAuthUrl(state);
        const isProduction = Deno.env.get("NETLIFY") === "true";
        const secureFlag = isProduction ? "; Secure" : "";

        return new Response(null, {
            status: 302,
            headers: {
                Location: authUrl,
                "Set-Cookie": `spotify_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax${secureFlag}`,
            },
        });
    } catch (error) {
        console.error("[Login] Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
