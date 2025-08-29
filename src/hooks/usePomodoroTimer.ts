// src/hooks/usePomodoroTimer.ts
import { useEffect, useRef, useState } from 'react';
import { DURATIONS, LONG_EVERY, type Tab } from '../config/timer';

type Phase = 'study' | 'break';
type Options = {
    durations?: typeof DURATIONS;
    longEvery?: number;
    onComplete?: (tab: Tab) => void;
};

export function usePomodoroTimer(opts: Options = {}) {
    const durations = opts.durations ?? DURATIONS;
    const longEvery = opts.longEvery ?? LONG_EVERY;

    const [tab, setTab] = useState<Tab>('study');
    const [secondsLeft, setSecondsLeft] = useState(durations[tab]);
    const [isRunning, setIsRunning] = useState(false);
    const completedStudies = useRef(0);
    const tickRef = useRef<number | null>(null);

  // keep seconds in sync if tab changes or durations change
    useEffect(() => setSecondsLeft(durations[tab]), [tab, durations]);

    useEffect(() => {
        if (!isRunning) return;
        tickRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
            if (s > 1) return s - 1;

        // handle rollover
            const prevTab = tab;
            if (prevTab === 'study') {
            completedStudies.current++;
            const isLong = completedStudies.current % longEvery === 0;
            setTab(isLong ? 'long' : 'short');
            } else {
            setTab('study');
            }
            opts.onComplete?.(prevTab);
            return 0;
        });
    }, 1000) as unknown as number;

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [isRunning, tab, longEvery, opts]);

    const start = () => setIsRunning(true);
    const pause = () => setIsRunning(false);
    const reset = () => { setIsRunning(false); setSecondsLeft(durations[tab]); };
    const switchTab = (t: Tab) => { setIsRunning(false); setTab(t); };

    const phase: Phase = tab === 'study' ? 'study' : 'break';
    const statusText = isRunning ? 'Running' : secondsLeft === durations[tab] ? 'Ready' : 'Paused';

    return { tab, secondsLeft, isRunning, start, pause, reset, switchTab, statusText, phase, durations };
}