// src/hooks/usePersistence.ts
import { useEffect, useRef, useState } from "react";
import { TABS, type Tab } from "@/config/timer";

export const PERSIST_KEY = "pomodoro:v1";
export type Saved = { tab: Tab; seconds: number; running: boolean; savedAt?: number };

function isSaved(x: any): x is Saved {
    return x && typeof x === "object"
        && typeof x.tab === "string"
        && typeof x.seconds === "number"
        && typeof x.running === "boolean";
}

export type PersistenceApi = {
    tab: Tab;
    secondsLeft: number;
    isRunning: boolean;
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

    // We ONLY mark hydrated here now. Actual restore happens inside usePomodoroTimer.
    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        if (typeof window === "undefined") { setHydrated(true); return; }

        // If you still want to sanity-clamp seconds on first mount, do it here:
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (isSaved(parsed) && TABS.includes(parsed.tab as Tab) && opts.clampSeconds) {
                    const clamped = opts.clampSeconds(parsed.tab as Tab, parsed.seconds);
                    if (clamped !== parsed.seconds) {
                        localStorage.setItem(storageKey, JSON.stringify({ ...parsed, seconds: clamped }));
                    }
                }
            }
        } catch { }
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Save on normal state changes (optional throttle)
    useEffect(() => {
        if (!hydrated || typeof window === "undefined") return;

        const saved: Saved = {
            tab: api.tab,
            seconds: opts.clampSeconds ? opts.clampSeconds(api.tab, api.secondsLeft) : api.secondsLeft,
            running: api.isRunning,
            savedAt: Date.now(),
        };

        if (opts.saveThrottleMs && opts.saveThrottleMs > 0) {
            const id = window.setTimeout(() => {
                try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { }
            }, opts.saveThrottleMs);
            return () => clearTimeout(id);
        } else {
            try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { }
        }
    }, [hydrated, api.tab, api.secondsLeft, api.isRunning, storageKey, opts.saveThrottleMs, opts.clampSeconds]);

    // Always capture a final, up-to-date snapshot on page hide/unload
    useEffect(() => {
        if (!hydrated || typeof window === "undefined") return;

        const saveNow = () => {
            const saved: Saved = {
                tab: api.tab,
                seconds: opts.clampSeconds ? opts.clampSeconds(api.tab, api.secondsLeft) : api.secondsLeft,
                running: api.isRunning,
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
            window.removeEventListener("beforeunload", onBeforeUnload); // fixed name
        };
        // Depend on the *current* values so the handler closure is always fresh
    }, [hydrated, storageKey, api.tab, api.secondsLeft, api.isRunning, opts.clampSeconds]);

    return { hydrated };
}

export function useStoredState<T>(key: string, initial: T) {
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : initial;
        } catch {
            return initial;
        }
    });

    // Persist on state changes
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch { }
    }, [key, value]);

    // Write a final snapshot on pagehide / beforeunload (mirrors your timer behavior)
    useEffect(() => {
        const write = () => {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
        };
        window.addEventListener("pagehide", write);
        window.addEventListener("beforeunload", write);
        return () => {
            window.removeEventListener("pagehide", write);
            window.removeEventListener("beforeunload", write);
        };
    }, [key, value]);

    return [value, setValue] as const;
}