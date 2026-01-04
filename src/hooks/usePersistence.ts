// src/hooks/usePersistence.ts
import { useEffect, useRef, useState } from "react";
import { TABS, type Tab } from "@/config/timer";
import { safeParseJSON } from "@/lib/json";
import { isValidSavedState, type TimerSavedState } from "@/types/timer";

export const PERSIST_KEY = "pomodoro:v1";

// Re-export for convenience
export type { TimerSavedState };

export type PersistenceApi = {
    tab: Tab;
    secondsLeft: number;
    isRunning: boolean;
    completedStudies: number;
    switchTab: (t: Tab) => void;
    setSeconds: (n: number) => void;
    start: () => void;
    pause: () => void;
};

type Options = {
    clampSeconds?: (tab: Tab, seconds: number) => number;
    saveThrottleMs?: number; // optional
};

export function usePersistence(
    api: PersistenceApi,
    storageKey = PERSIST_KEY,
    opts: Options = {}
) {
    const hydratedRef = useRef(false);
    const [hydrated, setHydrated] = useState(false);

    // Store current values in a ref to avoid re-attaching listeners on every tick
    const stateRef = useRef({
        tab: api.tab,
        secondsLeft: api.secondsLeft,
        isRunning: api.isRunning,
        completedStudies: api.completedStudies,
    });

    // Keep ref in sync with current values
    useEffect(() => {
        stateRef.current = {
            tab: api.tab,
            secondsLeft: api.secondsLeft,
            isRunning: api.isRunning,
            completedStudies: api.completedStudies,
        };
    }, [api.tab, api.secondsLeft, api.isRunning, api.completedStudies]);

    // We ONLY mark hydrated here now. Actual restore happens inside usePomodoroTimer.
    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        if (typeof window === "undefined") { setHydrated(true); return; }

        // If you still want to sanity-clamp seconds on first mount, do it here:
        const raw = localStorage.getItem(storageKey);
        const parsed = safeParseJSON<TimerSavedState>(raw, isValidSavedState);
        if (parsed && TABS.includes(parsed.tab as Tab) && opts.clampSeconds) {
            const clamped = opts.clampSeconds(parsed.tab as Tab, parsed.seconds);
            if (clamped !== parsed.seconds) {
                localStorage.setItem(storageKey, JSON.stringify({ ...parsed, seconds: clamped }));
            }
        }
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save on normal state changes (with optional throttle using latest values)
    useEffect(() => {
        if (!hydrated || typeof window === "undefined") return;

        const doSave = () => {
            const { tab, secondsLeft, isRunning, completedStudies } = stateRef.current;
            const saved: TimerSavedState = {
                tab,
                seconds: opts.clampSeconds ? opts.clampSeconds(tab, secondsLeft) : secondsLeft,
                running: isRunning,
                completedStudies,
                savedAt: Date.now(),
            };
            try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { }
        };

        if (opts.saveThrottleMs && opts.saveThrottleMs > 0) {
            const id = window.setTimeout(doSave, opts.saveThrottleMs);
            return () => clearTimeout(id);
        } else {
            doSave();
        }
    }, [hydrated, api.tab, api.secondsLeft, api.isRunning, api.completedStudies, storageKey, opts.saveThrottleMs, opts.clampSeconds]);

    // Attach page hide/unload listeners ONCE (they read from ref for latest values)
    useEffect(() => {
        if (!hydrated || typeof window === "undefined") return;

        const saveNow = () => {
            const { tab, secondsLeft, isRunning, completedStudies } = stateRef.current;
            const saved: TimerSavedState = {
                tab,
                seconds: opts.clampSeconds ? opts.clampSeconds(tab, secondsLeft) : secondsLeft,
                running: isRunning,
                completedStudies,
                savedAt: Date.now(),
            };
            try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { }
        };

        const onPageHide = () => saveNow();
        const onVisibility = () => { if (document.visibilityState === "hidden") saveNow(); };
        const onBeforeUnload = () => saveNow();

        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            window.removeEventListener("pagehide", onPageHide);
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
        // Only depend on hydrated and storageKey - listeners read from stateRef
    }, [hydrated, storageKey, opts.clampSeconds]);

    return { hydrated };
}

export function useStoredState<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
        const raw = localStorage.getItem(key);
        const parsed = safeParseJSON<T>(raw);
        return parsed ?? initial;
    });

    // Store current value in ref to avoid re-attaching listeners on every change
    const valueRef = useRef(value);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    // Persist on state changes
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch { }
    }, [key, value]);

    // Write a final snapshot on pagehide / beforeunload (mirrors your timer behavior)
    useEffect(() => {
        const write = () => {
            try { localStorage.setItem(key, JSON.stringify(valueRef.current)); } catch { }
        };
        window.addEventListener("pagehide", write);
        window.addEventListener("beforeunload", write);
        return () => {
            window.removeEventListener("pagehide", write);
            window.removeEventListener("beforeunload", write);
        };
    }, [key]); // Only re-attach if key changes, not value

    return [value, setValue] as const;
}