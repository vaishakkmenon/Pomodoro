import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getSupabase } from "./_shared/supabase.ts";
import { getValidAccessToken, getUserPlaylists } from "./_shared/spotify.ts";

export default async function handler(request: Request): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Get session
    const spotifyUserId = await getSession(request);
    if (!spotifyUserId) {
        return errorResponse("Unauthorized", 401, "NO_SESSION");
    }

    const supabase = getSupabase();

    // Verify Premium Link
    const { data: linkedUser } = await supabase
        .from("users")
        .select("email")
        .eq("spotify_user_id", spotifyUserId)
        .single();

    if (!linkedUser) {
        return errorResponse("Spotify account not linked", 401, "NOT_LINKED");
    }

    const { data: isPremium } = await supabase
        .from("allowed_users")
        .select("is_active")
        .eq("email", linkedUser.email.toLowerCase())
        .single();

    if (!isPremium?.is_active) {
        return errorResponse("Premium access revoked", 403, "NOT_PREMIUM");
    }

    try {
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

        return jsonResponse({ playlists });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";

        if (message === "NO_ACCOUNT" || message === "TOKEN_EXPIRED") {
            return errorResponse("Session expired, please reconnect Spotify", 401, message);
        }

        console.error("[Playlists] Error:", err);
        return errorResponse("Failed to fetch playlists", 500);
    }
}
