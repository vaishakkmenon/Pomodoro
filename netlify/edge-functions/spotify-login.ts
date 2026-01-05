import { getAuthUrl } from "./_shared/spotify.ts";
import { getSupabase } from "./_shared/supabase.ts";

export default async function handler(request: Request): Promise<Response> {
    try {
        const url = new URL(request.url);
        const siteUserId = url.searchParams.get("user_id");

        if (!siteUserId) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/?spotify_error=not_logged_in" },
            });
        }

        const supabase = getSupabase();

        // 1. Verify Site User
        const { data: siteUser, error: userError } = await supabase
            .from("users")
            .select("id, email")
            .eq("id", siteUserId)
            .single();

        if (userError || !siteUser) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/?spotify_error=invalid_user" },
            });
        }

        // 2. Check Premium Status
        const { data: isPremium } = await supabase
            .from("allowed_users")
            .select("is_active")
            .eq("email", siteUser.email.toLowerCase())
            .single();

        if (!isPremium?.is_active) {
            return new Response(null, {
                status: 302,
                headers: { Location: "/?spotify_error=not_premium" },
            });
        }

        // 3. Generate State with Link Info
        const stateObj = {
            csrf: crypto.randomUUID(),
            siteUserId: siteUser.id,
        };
        const state = btoa(JSON.stringify(stateObj));

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
