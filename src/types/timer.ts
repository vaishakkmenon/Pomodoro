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

/**
 * Minimal state needed for catch-up prompt check.
 */
export type CatchupCheckState = {
    running: boolean;
    savedAt: number;
};

/**
 * Type guard for catch-up check state.
 */
export function isValidCatchupState(x: unknown): x is CatchupCheckState {
    if (!x || typeof x !== "object") return false;
    const obj = x as Record<string, unknown>;
    return typeof obj.running === "boolean" && typeof obj.savedAt === "number";
}

export interface TimerState {
    tab: Tab;
    secondsLeft: number;
    isRunning: boolean;
    completedStudies: number;
    start: () => void;
    pause: () => void;
    reset: () => void;
    switchTab: (t: Tab) => void;
    setSeconds: (n: number) => void;
    atFull: boolean;
    isDone: boolean;
    phaseKind: "study" | "break";
    statusText: string;
    applyCatchup: (elapsed: number) => void;
    setSyncCallback: (cb: ((state: "FOCUS" | "BREAK" | "PAUSED") => void) | null) => void;
}
