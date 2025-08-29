// src/hooks/usePomodoroTimer.ts
import { useEffect, useRef, useState } from "react";
import { DURATIONS, LONG_EVERY, type Tab } from "../config/timer";

export type PhaseKind = "study" | "break";

type Options = {
    durations?: typeof DURATIONS;
    longEvery?: number;
    onComplete?: (prevTab: Tab) => void;
};

export function usePomodoroTimer(opts: Options = {}) {
    const durations = opts.durations ?? DURATIONS;
    const longEvery = opts.longEvery ?? LONG_EVERY;
    const { onComplete } = opts;

    const [tab, setTab] = useState<Tab>("study");
    const [secondsLeft, setSecondsLeft] = useState(durations[tab]);
    const [isRunning, setIsRunning] = useState(false);

    const completedStudies = useRef(0);
    const tickRef = useRef<number | null>(null);

    // keep seconds in sync if tab changes or durations change
    useEffect(() => {
        setSecondsLeft(durations[tab]);
    }, [tab, durations]);

    useEffect(() => {
        // always clear any prior interval when (re)running effect
        if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
        }

        if (!isRunning) return;

        tickRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
            if (s > 1) return s - 1;

            // handle rollover
            const prevTab = tab;
            if (prevTab === "study") {
            completedStudies.current += 1;
            const isLong = completedStudies.current % longEvery === 0;
            setTab(isLong ? "long" : "short");
            } else {
            setTab("study");
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
    }, [isRunning, tab, longEvery, onComplete]);

    const start = () => setIsRunning(true);
    const pause = () => setIsRunning(false);
    const reset = () => {
        setIsRunning(false);
        setSecondsLeft(durations[tab]);
    };
    const switchTab = (t: Tab) => {
        setIsRunning(false);
        setTab(t);
    };

    const setSeconds = (n: number) => {
        setIsRunning(false);
        const clamped = Math.max(0, Math.min(24 * 60 * 60, Math.floor(n)));
        setSecondsLeft(clamped);
    };

    // neutral derivations (UI-agnostic)
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
        // neutral helpers for UI
        atFull,
        isDone,
        phaseKind,
        statusText,
    };
}