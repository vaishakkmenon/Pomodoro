import { useEffect, useRef, useState } from "react";
import { DURATIONS, LONG_EVERY, type Tab, TABS } from "@/config/timer";
import { PERSIST_KEY } from "@/hooks/usePersistence"; // <-- share the same key

export type PhaseKind = "study" | "break";

type Options = {
    durations?: typeof DURATIONS;
    longEvery?: number;
    onComplete?: (prevTab: Tab) => void;
};

type Saved = { tab: Tab; seconds: number; running: boolean };

function readSaved(): Saved | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(PERSIST_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || typeof s !== "object") return null;
        if (typeof s.tab !== "string" || typeof s.seconds !== "number" || typeof s.running !== "boolean") return null;
        if (!TABS.includes(s.tab as Tab)) return null;
        return s as Saved;
    } catch {
        return null;
    }
}

export function usePomodoroTimer(opts: Options = {}) {
    const durations = opts.durations ?? DURATIONS;
    const longEvery = opts.longEvery ?? LONG_EVERY;
    const { onComplete } = opts;

    // ---- NEW: synchronous hydration ----
    const saved = readSaved();
    const initialTab: Tab = (saved?.tab as Tab) ?? "study";
    const initialSeconds = saved?.seconds ?? durations[initialTab];
    const initialRunning = !!saved?.running;

    const [tab, setTab] = useState<Tab>(initialTab);
    const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
    const [isRunning, setIsRunning] = useState<boolean>(initialRunning);

    const completedStudies = useRef(0);
    const tickRef = useRef<number | null>(null);

    // ticking loop (unchanged)
    useEffect(() => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        if (!isRunning) return;

        tickRef.current = window.setInterval(() => {
            setSecondsLeft((s) => {
                if (s > 1) return s - 1;

                // rollover
                const prevTab = tab;
                if (prevTab === "study") {
                    completedStudies.current += 1;
                    const isLong = completedStudies.current % longEvery === 0;
                    const next: Tab = isLong ? "long" : "short";
                    setTab(next);
                    setSecondsLeft(durations[next]);
                } else {
                    setTab("study");
                    setSecondsLeft(durations["study"]);
                }
                onComplete?.(prevTab);
                return 0;
            });
        }, 1000) as unknown as number;

        return () => {
            if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
            }
        };
    }, [isRunning, tab, longEvery, onComplete, durations]);

    const start = () => setIsRunning(true);
    const pause = () => setIsRunning(false);

    const reset = () => {
        setIsRunning(false);
        setSecondsLeft(durations[tab]);
    };

    // stop immediately, set tab + seconds explicitly
    const switchTab = (t: Tab) => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        setIsRunning(false);
        setTab(t);
        setSecondsLeft(durations[t]);
    };

    const setSeconds = (n: number) => {
        setIsRunning(false);
        const clamped = Math.max(0, Math.min(24 * 60 * 60, Math.floor(n)));
        setSecondsLeft(clamped);
    };

    // neutral derivations
    const atFull = secondsLeft === durations[tab];
    const isDone = secondsLeft === 0;
    const phaseKind: PhaseKind = tab === "study" ? "study" : "break";
    const statusText = isDone ? "Finished" : isRunning ? "Running" : atFull ? "Ready" : "Paused";

    return {
        tab,
        secondsLeft,
        isRunning,
        start,
        pause,
        reset,
        switchTab,
        setSeconds,
        atFull,
        isDone,
        phaseKind,
        statusText,
    };
}