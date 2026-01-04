import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getSupabase } from "./_shared/supabase.ts";

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

    // GET - Fetch preferences
    if (request.method === "GET") {
        const { data: prefs } = await supabase
            .from("spotify_preferences")
            .select("*")
            .eq("spotify_user_id", spotifyUserId)
            .single();

        // Return defaults if no prefs exist
        return jsonResponse(prefs || {
            focus_playlist_uri: null,
            break_playlist_uri: null,
            auto_play_enabled: false,
            volume_focus: 50,
            volume_break: 70,
        });
    }

    // POST - Update preferences
    if (request.method === "POST") {
        try {
            const body = await request.json();

            // Validate
            const prefs = {
                spotify_user_id: spotifyUserId,
                focus_playlist_uri: body.focus_playlist_uri ?? null,
                break_playlist_uri: body.break_playlist_uri ?? null,
                auto_play_enabled: Boolean(body.auto_play_enabled),
                volume_focus: Math.max(0, Math.min(100, Number(body.volume_focus) || 50)),
                volume_break: Math.max(0, Math.min(100, Number(body.volume_break) || 70)),
            };

            await supabase.from("spotify_preferences").upsert(prefs, {
                onConflict: "spotify_user_id",
            });

            return jsonResponse({ success: true });
        } catch (err) {
            console.error("[Settings] Error:", err);
            return errorResponse("Failed to save settings", 500);
        }
    }

    return errorResponse("Method not allowed", 405);
}
