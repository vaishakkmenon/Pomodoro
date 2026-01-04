export type TimerState = "FOCUS" | "BREAK" | "PAUSED";

export interface SpotifyUser {
    displayName: string | null;
    email: string | null;
}

export interface SpotifySession {
    authenticated: boolean;
    user: SpotifyUser | null;
}

export interface Playlist {
    uri: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
    owner: string;
}

export interface SpotifyPreferences {
    focus_playlist_uri: string | null;
    break_playlist_uri: string | null;
    auto_play_enabled: boolean;
    volume_focus: number;
    volume_break: number;
}
