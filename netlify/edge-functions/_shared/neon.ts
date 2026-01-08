// Neon database client for Deno edge functions
// Replaces Supabase client with direct Neon.tech connection

import { neon, NeonQueryFunction } from "https://esm.sh/@neondatabase/serverless@0.10.4";

let sql: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
    if (!sql) {
        const databaseUrl = Deno.env.get("DATABASE_URL");

        if (!databaseUrl) {
            throw new Error("Missing DATABASE_URL environment variable");
        }

        sql = neon(databaseUrl);
    }
    return sql;
}

// ============================================
// Database Types (match Drizzle schema)
// ============================================

export interface SpotifyAccount {
    id: string;
    user_id: string | null;        // Clerk user ID
    spotify_user_id: string;
    email: string | null;
    display_name: string | null;
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;     // Unix timestamp
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

export interface AllowedUser {
    id: number;
    email: string;
    is_active: boolean;
    created_at: string;
    user_id: string | null;        // Clerk user ID
    notes: string | null;
}

export interface AppUser {
    id: string;                    // Clerk user ID
    email: string;
    display_name: string | null;
    spotify_user_id: string | null;
    created_at: string;
    updated_at: string;
    preferences: Record<string, unknown> | null;
}

// ============================================
// Query Helpers
// ============================================

// Check if email is in allowed_users and active
export async function isUserAllowed(email: string): Promise<boolean> {
    const db = getDb();
    const result = await db`
        SELECT id FROM allowed_users
        WHERE LOWER(email) = LOWER(${email})
        AND is_active = true
        LIMIT 1
    `;
    return result.length > 0;
}

// Get app user by Clerk ID
export async function getAppUser(clerkUserId: string): Promise<AppUser | null> {
    const db = getDb();
    const result = await db`
        SELECT * FROM app_users
        WHERE id = ${clerkUserId}
        LIMIT 1
    `;
    return result[0] as AppUser | null;
}

// Get app user by email
export async function getAppUserByEmail(email: string): Promise<AppUser | null> {
    const db = getDb();
    const result = await db`
        SELECT * FROM app_users
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
    `;
    return result[0] as AppUser | null;
}

// Get Spotify account by Spotify user ID
export async function getSpotifyAccount(spotifyUserId: string): Promise<SpotifyAccount | null> {
    const db = getDb();
    const result = await db`
        SELECT * FROM spotify_accounts
        WHERE spotify_user_id = ${spotifyUserId}
        LIMIT 1
    `;
    return result[0] as SpotifyAccount | null;
}

// Get Spotify account by app user ID (Clerk ID)
export async function getSpotifyAccountByUserId(userId: string): Promise<SpotifyAccount | null> {
    const db = getDb();
    const result = await db`
        SELECT * FROM spotify_accounts
        WHERE user_id = ${userId}
        LIMIT 1
    `;
    return result[0] as SpotifyAccount | null;
}

// Upsert Spotify account
export async function upsertSpotifyAccount(account: {
    user_id: string;
    spotify_user_id: string;
    email: string | null;
    display_name: string | null;
    access_token: string;
    refresh_token: string;
    expires_at: number;
}): Promise<void> {
    const db = getDb();
    await db`
        INSERT INTO spotify_accounts (
            user_id, spotify_user_id, email, display_name,
            access_token, refresh_token, expires_at, updated_at
        ) VALUES (
            ${account.user_id}, ${account.spotify_user_id}, ${account.email},
            ${account.display_name}, ${account.access_token}, ${account.refresh_token},
            ${account.expires_at}, NOW()
        )
        ON CONFLICT (spotify_user_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            expires_at = EXCLUDED.expires_at,
            email = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            updated_at = NOW()
    `;
}

// Update Spotify tokens
export async function updateSpotifyTokens(
    spotifyUserId: string,
    accessToken: string,
    expiresAt: number,
    refreshToken?: string
): Promise<void> {
    const db = getDb();
    if (refreshToken) {
        await db`
            UPDATE spotify_accounts
            SET access_token = ${accessToken},
                expires_at = ${expiresAt},
                refresh_token = ${refreshToken},
                updated_at = NOW()
            WHERE spotify_user_id = ${spotifyUserId}
        `;
    } else {
        await db`
            UPDATE spotify_accounts
            SET access_token = ${accessToken},
                expires_at = ${expiresAt},
                updated_at = NOW()
            WHERE spotify_user_id = ${spotifyUserId}
        `;
    }
}

// Link Spotify to app user
export async function linkSpotifyToUser(clerkUserId: string, spotifyUserId: string): Promise<void> {
    const db = getDb();
    await db`
        UPDATE app_users
        SET spotify_user_id = ${spotifyUserId}, updated_at = NOW()
        WHERE id = ${clerkUserId}
    `;
}

// Get Spotify preferences
export async function getSpotifyPreferences(spotifyUserId: string): Promise<SpotifyPreferences | null> {
    const db = getDb();
    const result = await db`
        SELECT * FROM spotify_preferences
        WHERE spotify_user_id = ${spotifyUserId}
        LIMIT 1
    `;
    return result[0] as SpotifyPreferences | null;
}

// Upsert Spotify preferences
export async function upsertSpotifyPreferences(prefs: {
    spotify_user_id: string;
    focus_playlist_uri: string | null;
    break_playlist_uri: string | null;
    auto_play_enabled: boolean;
    volume_focus: number;
    volume_break: number;
}): Promise<void> {
    const db = getDb();
    await db`
        INSERT INTO spotify_preferences (
            spotify_user_id, focus_playlist_uri, break_playlist_uri,
            auto_play_enabled, volume_focus, volume_break, updated_at
        ) VALUES (
            ${prefs.spotify_user_id}, ${prefs.focus_playlist_uri}, ${prefs.break_playlist_uri},
            ${prefs.auto_play_enabled}, ${prefs.volume_focus}, ${prefs.volume_break}, NOW()
        )
        ON CONFLICT (spotify_user_id) DO UPDATE SET
            focus_playlist_uri = EXCLUDED.focus_playlist_uri,
            break_playlist_uri = EXCLUDED.break_playlist_uri,
            auto_play_enabled = EXCLUDED.auto_play_enabled,
            volume_focus = EXCLUDED.volume_focus,
            volume_break = EXCLUDED.volume_break,
            updated_at = NOW()
    `;
}

// Add user to allowed_users (admin function)
export async function addAllowedUser(email: string, notes?: string): Promise<{ id: number }> {
    const db = getDb();
    const result = await db`
        INSERT INTO allowed_users (email, is_active, notes)
        VALUES (LOWER(${email}), true, ${notes ?? null})
        RETURNING id
    `;
    return result[0] as { id: number };
}

// Get all allowed users (admin function)
export async function getAllowedUsers(): Promise<AllowedUser[]> {
    const db = getDb();
    const result = await db`
        SELECT * FROM allowed_users
        ORDER BY created_at DESC
    `;
    return result as AllowedUser[];
}

// Delete Spotify account
export async function deleteSpotifyAccount(spotifyUserId: string): Promise<void> {
    const db = getDb();
    await db`
        DELETE FROM spotify_accounts
        WHERE spotify_user_id = ${spotifyUserId}
    `;
    await db`
        DELETE FROM spotify_preferences
        WHERE spotify_user_id = ${spotifyUserId}
    `;
}

// Check if Spotify account is already linked to different user
export async function isSpotifyLinkedToOther(spotifyUserId: string, clerkUserId: string): Promise<boolean> {
    const db = getDb();
    const result = await db`
        SELECT user_id FROM spotify_accounts
        WHERE spotify_user_id = ${spotifyUserId}
        AND user_id IS NOT NULL
        AND user_id != ${clerkUserId}
        LIMIT 1
    `;
    return result.length > 0;
}

// Get app user by their linked Spotify user ID
export async function getAppUserBySpotifyId(spotifyUserId: string): Promise<AppUser | null> {
    const db = getDb();
    const result = await db`
        SELECT * FROM app_users
        WHERE spotify_user_id = ${spotifyUserId}
        LIMIT 1
    `;
    return result[0] as AppUser | null;
}

// Check premium status by email
export async function checkPremiumStatus(email: string): Promise<boolean> {
    const db = getDb();
    const result = await db`
        SELECT is_active FROM allowed_users
        WHERE LOWER(email) = LOWER(${email})
        AND is_active = true
        LIMIT 1
    `;
    return result.length > 0;
}
