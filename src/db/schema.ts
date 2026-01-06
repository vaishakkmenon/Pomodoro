
import { pgTable, serial, text, boolean, timestamp, integer, uuid, jsonb } from "drizzle-orm/pg-core";

// --- Allowed Users (Admin Panel) ---
export const allowedUsers = pgTable("allowed_users", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    userId: text("user_id"), // Linked Clerk User ID
    notes: text("notes"),
});

// --- App Users (Synced from Clerk/Auth) ---
// Using 'app_users' to avoid potential conflicts with reserved 'users' table names in some systems
export const appUsers = pgTable("app_users", {
    id: text("id").primaryKey(), // Clerk User ID (e.g. user_2N...)
    email: text("email").notNull().unique(),
    displayName: text("display_name"),
    spotifyUserId: text("spotify_user_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    // Store user preferences as a JSON object (theme, etc.)
    preferences: jsonb("preferences"),
});

// --- Spotify Accounts ---
export const spotifyAccounts = pgTable("spotify_accounts", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => appUsers.id), // Link to internal user (Clerk ID)
    spotifyUserId: text("spotify_user_id").notNull(),
    email: text("email"),
    displayName: text("display_name"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at"), // Unix timestamp
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Spotify Preferences ---
export const spotifyPreferences = pgTable("spotify_preferences", {
    spotifyUserId: text("spotify_user_id").primaryKey(), // Using Spotify ID as key
    focusPlaylistUri: text("focus_playlist_uri"),
    breakPlaylistUri: text("break_playlist_uri"),
    autoPlayEnabled: boolean("auto_play_enabled").default(false),
    volumeFocus: integer("volume_focus").default(50),
    volumeBreak: integer("volume_break").default(50),
    updatedAt: timestamp("updated_at").defaultNow(),
});
