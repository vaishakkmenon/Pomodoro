import { exchangeCodeForTokens, getCurrentUser } from "./_shared/spotify.ts";
import { getSupabase } from "./_shared/supabase.ts";
import { createSessionCookie } from "./_shared/session.ts";

export default async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Get stored state from cookie
    const cookies = request.headers.get("Cookie") || "";
    const storedStateMatch = cookies.match(/spotify_oauth_state=([^;]+)/);
    const storedState = storedStateMatch ? storedStateMatch[1] : null;

    // Handle errors
    if (error) {
        console.error("[OAuth] Error from Spotify:", error);
        return redirectWithError("access_denied");
    }

    if (!code || !state || state !== storedState) {
        console.error("[OAuth] Invalid state or missing code");
        return redirectWithError("invalid_state");
    }

    try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Get user profile
        const user = await getCurrentUser(tokens.access_token);

        // Calculate expiration timestamp
        const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

        // Upsert user in database
        const supabase = getSupabase();

        const { error: dbError } = await supabase.from("spotify_accounts").upsert({
            spotify_user_id: user.id,
            email: user.email,
            display_name: user.display_name,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
        }, {
            onConflict: "spotify_user_id",
        });

        if (dbError) {
            console.error("[OAuth] Database error:", dbError);
            throw new Error("Database error");
        }

        // Create session cookie
        const sessionCookie = await createSessionCookie(user.id);

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
