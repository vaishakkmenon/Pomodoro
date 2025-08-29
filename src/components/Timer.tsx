import { useEffect, useRef, useState } from "react";
import PillButton from "./ui/PillButton";
import { Phase } from "../ui/types";
import { cx } from "../ui/cx"


function format(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

type Tab = "study" | "short" | "long";
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

export default function Timer() {
    const [tab, setTab] = useState<Tab>("study");
    const [secondsLeft, setSecondsLeft] = useState(DURATIONS.study);
    const [isRunning, setIsRunning] = useState(false);

    const intervalRef = useRef<number | null>(null);

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
                    setIsRunning(false);
                    return 0;
                }
                return prev - 1;
            })
        }, 1000);

        // cleanup when component unmounts or isRunning flips
        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning]);

    function switchTab(next: Tab) {
        setIsRunning(false);
        setTab(next);
        setSecondsLeft(DURATIONS[next]);
    }

    const phaseForAccent: Phase = tab === "study" ? "focus" : "break";

    return (
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex gap-2">
                {/* LEFT: Vertical tabs */}
                <nav className="w-40">
                    <div className="flex flex-col gap-2">
                        {(Object.keys(LABELS) as Tab[]).map(key => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => switchTab(key)}
                                aria-current={tab === key ? "page" : undefined}
                                className={cx(
                                    "w-full rounded-xl px-3 py-2 text-sm text-white text-left transition",
                                    "focus-visible:outline-none focus-visible:ring-2",
                                    tab === key
                                        ? "bg-white/15 focus-visible:ring-white/30"
                                        : "bg-white/5 hover:bg-white/10 focus-visible:ring-white/20"
                                )}
                            >
                                {LABELS[key]}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* RIGHT: Timer */}
                <section className="flex-1">
                    <div className="mb-6 text-center text-8xl font-bold tabular-nums">
                        {format(secondsLeft)}
                    </div>

                    <div className="flex justify-center gap-3">
                        <PillButton
                            type="button"
                            phase={phaseForAccent}
                            onClick={() => setIsRunning(v => !v)}
                            aria-pressed={isRunning}
                            className="min-w-28 justify-center !text-lg !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRunning ? "Pause" : "Start"}
                        </PillButton>

                        <PillButton
                            type="button"
                            phase={phaseForAccent}
                            variant="danger"
                            onClick={() => { setIsRunning(false); setSecondsLeft(DURATIONS[tab]); }}
                            className="min-w-28 justify-center !text-lg !px-4 !py-2"
                            title="Reset timer"
                        >
                            Reset
                        </PillButton>
                    </div>
                </section>
            </div>
        </div>
    );
}