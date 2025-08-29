import { useEffect, useRef, useState } from "react";
import PillButton from "./ui/PillButton";
import type { Phase } from "../ui/types";
import { cx } from "../ui/cx";
import { useChime } from "../sound/useChime";

// Types and Constants
type Tab = "study" | "short" | "long";
const TABS: Tab[] = ["study", "short", "long"];


const LABELS: Record<Tab, string> = {
    study: "Study Time",
    short: "Short Break",
    long: "Long Break",
};

const DURATIONS: Record<Tab, number> = {
    study: 25 * 60,
    short: 5 * 60,
    long: 15 * 60,
};

const LONG_EVERY = 4;

function format(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export default function Timer() {
    const [tab, setTab] = useState<Tab>("study");
    const [secondsLeft, setSecondsLeft] = useState(DURATIONS.study);
    const [isRunning, setIsRunning] = useState(false);

    const intervalRef = useRef<number | null>(null);
    const completedStudiesRef = useRef(0);

    const { play: playChime, prime: primeAudio } = useChime("/sounds/windchimes.mp3", 0.28);
    function switchTab(next: Tab) {
        setIsRunning(false);
        setTab(next);
        setSecondsLeft(DURATIONS[next]);
    }

    function onComplete() {
        if (tab === "study") {
            playChime();
            completedStudiesRef.current += 1;
            const next: Tab = completedStudiesRef.current % LONG_EVERY === 0 ? "long" : "short";
            switchTab(next);
        } else {
            switchTab("study");
        }
    }

    useEffect(() => {
        if (!isRunning) {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
            return;
        }

        intervalRef.current = window.setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    if (intervalRef.current) {
                        window.clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    onComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning, tab]);

    const phaseForAccent: Phase = tab === "study" ? "focus" : "break";
    const atFull = secondsLeft === DURATIONS[tab];

    return (
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex gap-6">
                {/* LEFT: Vertical tabs */}
                <nav className="w-44 self-stretch" aria-label="Session modes">
                    <div
                        className="flex h-full flex-col justify-evenly -mx-3"
                        role="tablist"
                        aria-orientation="vertical"
                    >
                        {TABS.map((key) => {
                            const tabId = `tab-${key}`;
                            return (
                                <button
                                    key={key}
                                    id={tabId}
                                    role="tab"
                                    aria-selected={tab === key}
                                    aria-controls="panel-session"
                                    tabIndex={tab === key ? 0 : -1}
                                    type="button"
                                    onClick={() => switchTab(key)}
                                    className={cx(
                                        "relative block w-full text-left px-3 py-2 bg-transparent rounded-none text-white",
                                        "hover:bg-white/5 transition",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                                        tab === key &&
                                        "bg-white/10 before:absolute before:left-0 before:inset-y-1 before:w-1 before:rounded-full before:bg-white/40"
                                    )}
                                >
                                    {LABELS[key]}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* RIGHT: Timer */}
                <section
                    id="panel-session"
                    role="tabpanel"
                    aria-labelledby={`tab-${tab}`}
                    className="flex-1"
                >
                    <div className="mb-6 text-center text-8xl font-bold tabular-nums">
                        {format(secondsLeft)}
                    </div>

                    <div className="flex justify-center gap-3">
                        <PillButton
                            type="button"
                            phase={phaseForAccent}
                            onClick={() => {
                                primeAudio();
                                setIsRunning((v) => !v);
                            }}
                            aria-pressed={isRunning}
                            className="min-w-28 justify-center !text-lg !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={secondsLeft === 0 && !isRunning}
                        >
                            {isRunning ? "Pause" : "Start"}
                        </PillButton>

                        <PillButton
                            type="button"
                            phase={phaseForAccent}
                            variant="danger"
                            onClick={() => {
                                setIsRunning(false);
                                setSecondsLeft(DURATIONS[tab]);
                            }}
                            className="min-w-28 justify-center !text-lg !px-4 !py-2"
                            disabled={atFull}
                            title={atFull ? "Already reset" : "Reset timer"}
                        >
                            Reset
                        </PillButton>
                    </div>
                </section>
            </div >
        </div >
    );
}