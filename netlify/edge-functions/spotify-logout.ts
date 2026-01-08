import { deleteSessionCookie } from "./_shared/session.ts";
import { handleCors, corsHeaders } from "./_shared/cors.ts";

export default async function handler(request: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const headers = new Headers(corsHeaders(request));

    // Clear session cookie using the proper function
    headers.append("Set-Cookie", deleteSessionCookie());

    // Clear OAuth state cookie (prevent reuse)
    headers.append("Set-Cookie", "spotify_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers,
    });
}
