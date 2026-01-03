import type { Tab } from "@/config/timer";

/**
 * Shape of data persisted to localStorage for timer state.
 * Used by both usePomodoroTimer (read) and usePersistence (write).
 * 
 * NOTE: We use `seconds` here (not `secondsLeft`) for backwards compatibility
 * with existing localStorage data. Hooks use `secondsLeft` for clarity.
 */
export type TimerSavedState = {
    /** Current timer tab/phase */
    tab: Tab;
    /** Seconds remaining in current phase (stored as `seconds` for backwards compatibility) */
    seconds: number;
    /** Whether timer was running when saved */
    running: boolean;
    /** Number of completed study sessions (for long break calculation) */
    completedStudies: number;
    /** Unix timestamp when state was saved (for catch-up calculation) */
    savedAt: number;
};

/**
 * Type guard to validate parsed localStorage data.
 */
export function isValidSavedState(x: unknown): x is TimerSavedState {
    if (!x || typeof x !== "object") return false;
    const obj = x as Record<string, unknown>;
    return (
        typeof obj.tab === "string" &&
        typeof obj.seconds === "number" &&
        typeof obj.running === "boolean"
        // completedStudies and savedAt are optional for backwards compatibility
    );
}
