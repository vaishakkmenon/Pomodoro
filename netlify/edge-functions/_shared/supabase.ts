import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabase) {
        // Support both standard Next.js names and generic names
        const url = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
        const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_KEY");

        if (!url || !key) {
            throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        }

        supabase = createClient(url, key);
    }
    return supabase;
}

// ============================================
// Database Types
// ============================================
export interface SpotifyAccount {
    id: string;
    spotify_user_id: string;
    email: string | null;
    display_name: string | null;
    access_token: string;
    refresh_token: string;
    expires_at: number;
    created_at: string;
    updated_at: string;
}

export interface SpotifyPreferences {
    spotify_user_id: string;
    focus_playlist_uri: string | null;
    break_playlist_uri: string | null;
    auto_play_enabled: boolean;
    volume_focus: number;
    volume_break: number;
    updated_at: string;
}
