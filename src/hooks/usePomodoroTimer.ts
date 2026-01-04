import { useEffect, useRef, useState } from "react";
import { DURATIONS, LONG_EVERY, MAX_TIMER_SECONDS, type Tab, TABS } from "@/config/timer";
import { PERSIST_KEY } from "@/hooks/usePersistence";
import { safeParseJSON } from "@/lib/json";
import { isValidSavedState, type TimerSavedState } from "@/types/timer";

export type PhaseKind = "study" | "break";

type Options = {
    durations?: typeof DURATIONS;
    longEvery?: number;
    onComplete?: (prevTab: Tab) => void;
};

function readSaved(): TimerSavedState | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(PERSIST_KEY);
    const s = safeParseJSON<TimerSavedState>(raw, isValidSavedState);
    if (!s || !TABS.includes(s.tab as Tab)) return null;
    return s;
}

export function usePomodoroTimer(opts: Options = {}) {
    const durations = opts.durations ?? DURATIONS;
    const longEvery = opts.longEvery ?? LONG_EVERY;
    const { onComplete } = opts;

    // ---- synchronous hydration (PAUSED on return) ----
    const saved = readSaved();
    const initialTab: Tab = (saved?.tab as Tab) ?? "study";
    const initialSeconds = saved?.seconds ?? durations[initialTab];
    const initialRunning = false; // <— always pause on load

    const [tab, setTab] = useState<Tab>(initialTab);
    const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
    const [isRunning, setIsRunning] = useState<boolean>(initialRunning);

    // NOTE: completedStudies is a ref (not state) to avoid extra re-renders since
    // the UI doesn't display this value. Persistence works because completedStudies
    // only changes when tab/secondsLeft also change, which triggers the save effect.
    // If you modify this to update completedStudies independently, ensure persistence still works.
    // Spotify Sync Callback
    const syncRef = useRef<((state: "FOCUS" | "BREAK" | "PAUSED") => void) | null>(null);
    const setSyncCallback = (cb: ((state: "FOCUS" | "BREAK" | "PAUSED") => void) | null) => {
        syncRef.current = cb;
    };

    const completedStudies = useRef<number>(saved?.completedStudies ?? 0);
    const tickRef = useRef<number | null>(null);

    // ticking loop
    useEffect(() => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        if (!isRunning) return;

        tickRef.current = window.setInterval(() => {
            setSecondsLeft((s) => {
                if (s > 1) return s - 1;

                const prevTab = tab;
                if (prevTab === "study") {
                    completedStudies.current += 1;
                    const isLong = completedStudies.current % longEvery === 0;
                    const next: Tab = isLong ? "long" : "short";
                    setTab(next);
                    setSecondsLeft(durations[next]);
                    // Sync: Switch to Break music
                    syncRef.current?.("BREAK");
                } else {
                    setTab("study");
                    setSecondsLeft(durations["study"]);
                    // Sync: Switch to Focus music
                    syncRef.current?.("FOCUS");
                }
                onComplete?.(prevTab);
                return 0;
            });
        }, 1000);

        return () => {
            if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
            }
        };
    }, [isRunning, tab, longEvery, onComplete, durations]);

    const start = () => {
        setIsRunning(true);
        // Sync: Start music based on current tab
        syncRef.current?.(tab === "study" ? "FOCUS" : "BREAK");
    };

    const pause = () => {
        setIsRunning(false);
        // Sync: Pause music
        syncRef.current?.("PAUSED");
    };

    const reset = () => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        setIsRunning(false);
        setSecondsLeft(durations[tab]);
        // Sync: Pause music on reset
        syncRef.current?.("PAUSED");
    };

    const switchTab = (t: Tab) => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        setIsRunning(false);
        setTab(t);
        setSecondsLeft(durations[t]);
        // Sync: Pause music on tab switch
        syncRef.current?.("PAUSED");
    };

    const setSeconds = (n: number) => {
        setIsRunning(false);
        const clamped = Math.max(0, Math.min(MAX_TIMER_SECONDS, Math.floor(n)));
        setSecondsLeft(clamped);
        // Sync: Pause music on manual time change? Maybe not strictly necessary but safe
        syncRef.current?.("PAUSED");
    };

    // Apply catch-up but remain PAUSED so the user can choose when to resume
    const applyCatchup = (elapsed: number) => {
        const e0 = Math.max(0, Math.floor(elapsed));
        if (!e0) return;

        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }

        let e = e0;
        let t = tab;
        let rem = secondsLeft;
        let cs = completedStudies.current;

        while (e > 0) {
            if (e < rem) {
                rem -= e;
                e = 0;
                break;
            }
            e -= rem;
            if (t === "study") {
                cs += 1;
                const isLong = cs % longEvery === 0;
                t = isLong ? "long" : "short";
                rem = durations[t];
            } else {
                t = "study";
                rem = durations.study;
            }
        }

        completedStudies.current = cs;
        setTab(t);
        setSecondsLeft(rem);
        // Only start if there's time remaining, otherwise timer would be stuck at 0
        if (rem > 0) {
            setIsRunning(true);
            // Sync: Resume play based on new tab
            syncRef.current?.(t === "study" ? "FOCUS" : "BREAK");
        }
    };

    const atFull = secondsLeft === durations[tab];
    const isDone = secondsLeft === 0;
    const phaseKind: PhaseKind = tab === "study" ? "study" : "break";
    const statusText = isDone ? "Finished" : isRunning ? "Running" : atFull ? "Ready" : "Paused";

    return {
        tab,
        secondsLeft,
        isRunning,
        completedStudies: completedStudies.current,
        start,
        pause,
        reset,
        switchTab,
        setSeconds,
        atFull,
        isDone,
        phaseKind,
        statusText,
        applyCatchup,
        setSyncCallback,
    };
}