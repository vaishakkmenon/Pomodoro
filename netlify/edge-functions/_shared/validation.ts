// Input validation helpers for edge functions

/**
 * Spotify URI format: spotify:type:id
 * - Type: playlist, album, track, artist, show, episode
 * - ID: 22 alphanumeric characters
 */
const SPOTIFY_URI_REGEX = /^spotify:(playlist|album|track|artist|show|episode):[a-zA-Z0-9]{22}$/;

/**
 * Spotify URL format: https://open.spotify.com/type/id
 */
const SPOTIFY_URL_REGEX = /^https:\/\/open\.spotify\.com\/(playlist|album|track|artist|show|episode)\/([a-zA-Z0-9]{22})(\?.*)?$/;

/**
 * Validate and normalize a Spotify URI
 * Accepts both URI format (spotify:playlist:xxx) and URL format (https://open.spotify.com/playlist/xxx)
 * Returns normalized URI format, or null if invalid
 */
export function validateSpotifyUri(input: unknown): string | null {
    if (typeof input !== "string") return null;

    const trimmed = input.trim();
    if (!trimmed) return null;

    // Already a valid URI
    if (SPOTIFY_URI_REGEX.test(trimmed)) {
        return trimmed;
    }

    // Convert URL to URI format
    const urlMatch = trimmed.match(SPOTIFY_URL_REGEX);
    if (urlMatch) {
        const [, type, id] = urlMatch;
        return `spotify:${type}:${id}`;
    }

    return null;
}

/**
 * Validate volume (0-100)
 */
export function validateVolume(input: unknown, defaultValue = 50): number {
    if (typeof input === "number" && !isNaN(input)) {
        return Math.max(0, Math.min(100, Math.round(input)));
    }
    if (typeof input === "string") {
        const num = parseInt(input, 10);
        if (!isNaN(num)) {
            return Math.max(0, Math.min(100, num));
        }
    }
    return defaultValue;
}

/**
 * Validate boolean
 */
export function validateBoolean(input: unknown, defaultValue = false): boolean {
    if (typeof input === "boolean") return input;
    if (input === "true" || input === 1) return true;
    if (input === "false" || input === 0) return false;
    return defaultValue;
}

/**
 * Validate email format (basic check)
 */
export function validateEmail(input: unknown): string | null {
    if (typeof input !== "string") return null;
    const trimmed = input.trim().toLowerCase();
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? trimmed : null;
}

/**
 * Validate timer state (from frontend)
 */
export type TimerState = "FOCUS" | "BREAK" | "PAUSED";

export function validateTimerState(input: unknown): TimerState | null {
    if (input === "FOCUS" || input === "BREAK" || input === "PAUSED") {
        return input;
    }
    return null;
}

/**
 * Sanitize string input (prevent injection)
 * Removes control characters and trims whitespace
 */
export function sanitizeString(input: unknown, maxLength = 1000): string | null {
    if (typeof input !== "string") return null;
    // Remove control characters (except newlines and tabs for multi-line text)
    const sanitized = input
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .trim()
        .slice(0, maxLength);
    return sanitized || null;
}
