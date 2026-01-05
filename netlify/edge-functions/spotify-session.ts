import { handleCors, jsonResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getSupabase } from "./_shared/supabase.ts";

export default async function handler(request: Request): Promise<Response> {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const spotifyUserId = await getSession(request);

    if (!spotifyUserId) {
        return jsonResponse({ authenticated: false });
    }

    const supabase = getSupabase();

    // Verify Premium Link
    const { data: linkedUser } = await supabase
        .from("users")
        .select("email")
        .eq("spotify_user_id", spotifyUserId)
        .single();

    if (!linkedUser) return jsonResponse({ authenticated: false });

    const { data: isPremium } = await supabase
        .from("allowed_users")
        .select("is_active")
        .eq("email", linkedUser.email.toLowerCase())
        .single();

    if (!isPremium?.is_active) return jsonResponse({ authenticated: false });

    // Get user info from database
    const { data: account, error } = await supabase
        .from("spotify_accounts")
        .select("display_name, email")
        .eq("spotify_user_id", spotifyUserId)
        .single();

    if (error && error.code !== "PGRST116") { // Ignore no rows found
        console.error("[Session] DB Error:", error);
    }

    return jsonResponse({
        authenticated: true,
        user: account ? {
            displayName: account.display_name,
            email: account.email,
        } : null,
    });
}
