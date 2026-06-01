import { useEffect, useRef, useState, useMemo } from "react";
import { DURATIONS, LONG_EVERY, MAX_TIMER_SECONDS, type Tab, TABS } from "@/config/timer";
import { PERSIST_KEY } from "@/hooks/usePersistence";
import { safeParseJSON } from "@/lib/json";
import { isValidSavedState, type TimerSavedState } from "@/types/timer";
import type { Settings } from "@/types/settings";
import { sendNotification } from "@/lib/notifications";
import { chimePlayer } from "@/lib/audio";

export type PhaseKind = "study" | "break";

type Options = {
    settings?: Settings;
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
    // Map settings to duration object, fallback to defaults if no settings
    const settings = opts.settings;

    // Convert minutes to seconds for internal logic
    // We need a stable duration map. If settings change, this changes.
    const durationMap: Record<Tab, number> = useMemo(() => settings ? {
        study: settings.durations.work * 60,
        short: settings.durations.shortBreak * 60,
        long: settings.durations.longBreak * 60,
    } : DURATIONS, [settings]);

    const longEvery = settings?.longBreakInterval ?? LONG_EVERY;
    const { onComplete } = opts;

    // ---- Safe hydration pattern ----
    // 1. Initialize with server-safe defaults (no localStorage access)
    // 2. Hydrate from localStorage in useEffect

    // Default start state
    const [tab, setTab] = useState<Tab>("study");
    // completedStudies needs to be a ref for persistence logic, but we can init it to 0
    const completedStudies = useRef<number>(0);

    const [secondsLeft, setSecondsLeft] = useState<number>(durationMap["study"]);
    const [isRunning, setIsRunning] = useState<boolean>(false);

    // Hydrate effect
    useEffect(() => {
        const saved = readSaved();
        if (saved) {
            setTab(saved.tab as Tab);
            setSecondsLeft(saved.seconds);
            completedStudies.current = saved.completedStudies;
            // Ensure we don't auto-start on reload, or keep it paused
            setIsRunning(false);
        }
    }, []); // Run once on mount

    // Auto-update timer if settings change and it was sitting at full duration
    const prevDurationMap = useRef(durationMap);
    useEffect(() => {
        const oldDur = prevDurationMap.current[tab];
        const newDur = durationMap[tab];

        // If duration for current tab changed
        if (oldDur !== newDur) {
            // And we were sitting at the old max (idle/fresh)
            if (secondsLeft === oldDur) {
                setSecondsLeft(newDur);
            }
        }
        prevDurationMap.current = durationMap;
    }, [durationMap, tab, secondsLeft]);

    // Update secondsLeft if settings change and we are at the "start" of a timer? 
    // Actually, we shouldn't arbitrarily change secondsLeft if settings change UNLESS we haven't loaded saved state yet
    // OR if we want live updates. But for this fix, we just ensure simple hydration.


    // NOTE: completedStudies is a ref (not state) to avoid extra re-renders since
    // the UI doesn't display this value. Persistence works because completedStudies
    // only changes when tab/secondsLeft also change, which triggers the save effect.
    // If you modify this to update completedStudies independently, ensure persistence still works.
    // Spotify Sync Callback
    const syncRef = useRef<((state: "FOCUS" | "BREAK" | "PAUSED") => void) | null>(null);
    const setSyncCallback = (cb: ((state: "FOCUS" | "BREAK" | "PAUSED") => void) | null) => {
        syncRef.current = cb;
    };

    const tickRef = useRef<number | null>(null);

    // Absolute wall-clock timestamp (ms) at which the current phase hits zero.
    // This — not the number of interval ticks — is the source of truth for the
    // countdown. Browsers throttle/suspend setInterval in background tabs, so a
    // tick-counting timer drifts whenever the page is hidden. By deriving the
    // remaining time from `deadline - Date.now()` we stay correct no matter how
    // few ticks actually fired while we were away.
    // null whenever the timer is not actively counting down (paused/idle).
    const deadlineRef = useRef<number | null>(null);

    // We need a ref for secondsLeft so the interval can read the latest value
    // without needing to be recreated on every tick (which would be messy).
    const secondsRef = useRef(secondsLeft);
    useEffect(() => {
        secondsRef.current = secondsLeft;
    }, [secondsLeft]);

    // ticking loop
    useEffect(() => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        if (!isRunning) return;

        // Anchor the deadline the first time we start counting down for this
        // phase. Subsequent effect re-runs (settings/tab changes) keep the
        // existing deadline so the countdown stays continuous, and an auto-start
        // phase transition carries its own deadline forward (see below).
        if (deadlineRef.current === null) {
            deadlineRef.current = Date.now() + secondsRef.current * 1000;
        }

        // Reconcile the displayed time against the wall clock. Called on every
        // interval tick AND whenever the tab becomes visible/focused again, so
        // returning to a backgrounded tab instantly shows the correct value.
        const tick = () => {
            if (deadlineRef.current === null) return;

            const remaining = Math.round((deadlineRef.current - Date.now()) / 1000);
            if (remaining > 0) {
                setSecondsLeft(remaining);
                return;
            }

            // Phase complete.
            const prevTab = tab;

            if (settings?.notifications.enabled) {
                sendNotification(
                    prevTab === "study" ? "Focus session complete!" : "Break over!",
                    prevTab === "study" ? "Time for a break." : "Ready to focus?"
                );
            }
            if (settings?.sound.enabled) {
                chimePlayer.play(settings.sound.volume);
            }

            const shouldAutoStart = settings?.autoStart ?? false;

            // Determine the next phase.
            let next: Tab;
            if (prevTab === "study") {
                completedStudies.current += 1;
                const isLong = completedStudies.current % longEvery === 0;
                next = isLong ? "long" : "short";
            } else {
                next = "study";
            }

            if (shouldAutoStart) {
                // Carry the deadline forward from the phase that just ended (not
                // from "now"), so a long absence catches up across phases on the
                // next ticks instead of restarting the clock.
                deadlineRef.current = deadlineRef.current + durationMap[next] * 1000;
                const nextRemaining = Math.max(
                    0,
                    Math.min(durationMap[next], Math.round((deadlineRef.current - Date.now()) / 1000))
                );
                setTab(next);
                setSecondsLeft(nextRemaining);
                syncRef.current?.(next === "study" ? "FOCUS" : "BREAK");
            } else {
                // Stop at the start of the next phase, paused, full duration.
                deadlineRef.current = null;
                setIsRunning(false);
                setTab(next);
                setSecondsLeft(durationMap[next]);
                syncRef.current?.("PAUSED");
            }

            onComplete?.(prevTab);
        };

        // Reconcile immediately (covers the case where the deadline already
        // passed while the tab was hidden and this effect is only running now).
        tick();

        tickRef.current = window.setInterval(tick, 1000);

        const onVisible = () => {
            if (document.visibilityState === "visible") tick();
        };
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);
        window.addEventListener("pageshow", onVisible);

        return () => {
            if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
            }
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
            window.removeEventListener("pageshow", onVisible);
        };
    }, [isRunning, tab, longEvery, onComplete, durationMap, settings]);

    const start = () => {
        setIsRunning(true);
        // Sync: Start music based on current tab
        syncRef.current?.(tab === "study" ? "FOCUS" : "BREAK");
    };

    const pause = () => {
        // Snapshot the precise remaining time from the wall clock before tearing
        // down the deadline, so the paused/persisted value is accurate.
        if (deadlineRef.current !== null) {
            const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
            setSecondsLeft(remaining);
        }
        deadlineRef.current = null;
        setIsRunning(false);
        // Sync: Pause music
        syncRef.current?.("PAUSED");
    };

    const reset = () => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        deadlineRef.current = null;
        setIsRunning(false);
        setTab("study");
        setSecondsLeft(durationMap["study"]);
        completedStudies.current = 0;
        syncRef.current?.("PAUSED");
        localStorage.removeItem(PERSIST_KEY);
    };

    const switchTab = (t: Tab) => {
        if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
        }
        deadlineRef.current = null;
        setIsRunning(false);
        setTab(t);
        setSecondsLeft(durationMap[t]);
        // Sync: Pause music on tab switch
        syncRef.current?.("PAUSED");
    };

    const setSeconds = (n: number) => {
        deadlineRef.current = null;
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
        // Re-anchor: the ticking effect will set a fresh deadline from the
        // post-catch-up remaining once we flip isRunning on below.
        deadlineRef.current = null;

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
                rem = durationMap[t];
            } else {
                t = "study";
                rem = durationMap.study;
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

    const atFull = secondsLeft === durationMap[tab];
    const isDone = secondsLeft === 0;
    const phaseKind: PhaseKind = tab === "study" ? "study" : "break";
    const statusText = isDone ? "Finished" : isRunning ? "Running" : atFull ? "Ready" : "Paused";

    // The whole process is untouched: first Study phase, full duration, never run,
    // no completed sessions. When this is false there is progress worth resetting.
    const isPristine =
        tab === "study" &&
        completedStudies.current === 0 &&
        atFull &&
        !isRunning;

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
        isPristine,
        phaseKind,
        statusText,
        applyCatchup,
        setSyncCallback,
    };
}