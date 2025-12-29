/**
 * Formats total seconds as MM:SS string.
 * Minutes are not capped (e.g., 90 minutes = "90:00")
 */
export function formatTime(total: number) {
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

/**
 * Parses a flexible time input string into total seconds.
 * Accepts formats:
 * - "MM:SS" (e.g., "25:30" → 1530 seconds)
 * - Digits only with implied MM:SS (e.g., "2530" → 25:30 → 1530 seconds)
 * - Short digits as minutes (e.g., "30" → 30:00 → 1800 seconds)
 * 
 * Returns null if the input is invalid.
 */
export function parseFlexibleTime(raw: string): number | null {
    const s = raw.trim();
    if (!s) return null;

    if (s.includes(":")) {
        const [mm, ss] = s.split(":");
        if (!/^\d{1,3}$/.test(mm || "") || !/^\d{1,2}$/.test(ss || "")) return null;
        const mins = parseInt(mm, 10);
        const secs = parseInt(ss, 10);
        if (secs >= 60) return null;
        return mins * 60 + secs;
    }

    if (!/^\d+$/.test(s)) return null;
    if (s.length <= 2) return parseInt(s, 10) * 60;
    const secs = parseInt(s.slice(-2), 10);
    if (secs >= 60) return null;
    const mins = parseInt(s.slice(0, -2) || "0", 10);
    return mins * 60 + secs;
}

/**
 * Sanitizes time input to only allow digits and a single colon.
 * Used for controlled input during time editing.
 */
export function sanitizeTimeInput(s: string): string {
    const cleaned = s.replace(/[^\d:]/g, "");
    const first = cleaned.indexOf(":");
    if (first === -1) return cleaned;
    return cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/:/g, "");
}
