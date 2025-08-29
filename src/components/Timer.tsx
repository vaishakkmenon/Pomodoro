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

    // tab focus management
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [focusIdx, setFocusIdx] = useState(() => TABS.indexOf(tab));
    useEffect(() => {
        setFocusIdx(TABS.indexOf(tab)); // keep roving focus in sync with selection
    }, [tab]);

    // focusable controls on the panel
    const startBtnRef = useRef<HTMLButtonElement | null>(null);
    const resetBtnRef = useRef<HTMLButtonElement | null>(null);

    const startDisabled = secondsLeft === 0 && !isRunning;
    const resetDisabled = secondsLeft === DURATIONS[tab];

    // audio
    const { play: playChime, prime: primeAudio } = useChime(
        "/sounds/windchimes.mp3",
        0.28
    );

    function switchTab(next: Tab) {
        setIsRunning(false);
        setTab(next);
        setSecondsLeft(DURATIONS[next]);
    }

    function onComplete() {
        if (tab === "study") {
            playChime();
            completedStudiesRef.current += 1;
            const next: Tab =
                completedStudiesRef.current % LONG_EVERY === 0 ? "long" : "short";
            switchTab(next);
        } else {
            switchTab("study");
        }
    }

    // ticking logic
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

    // tablist keyboard nav (Up/Down inside tabs; handoff at edges)
    function onTabsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const target = e.target as HTMLElement;
        if (target.getAttribute("role") !== "tab") return;

        const last = TABS.length - 1;
        let next = focusIdx;

        switch (e.key) {
            case "ArrowDown":
                if (focusIdx === last) {
                    // Long → Start → Reset → Study (skip disabled)
                    if (!startDisabled) startBtnRef.current?.focus();
                    else if (!resetDisabled) resetBtnRef.current?.focus();
                    else { setFocusIdx(0); tabRefs.current[0]?.focus(); }
                    e.preventDefault();
                    return;
                }
                next = focusIdx + 1;
                e.preventDefault();
                break;

            case "ArrowUp":
                if (focusIdx === 0) {
                    // Study → Reset → Start → Long (skip disabled)
                    if (!resetDisabled) resetBtnRef.current?.focus();
                    else if (!startDisabled) startBtnRef.current?.focus();
                    else { setFocusIdx(last); tabRefs.current[last]?.focus(); }
                    e.preventDefault();
                    return;
                }
                next = focusIdx - 1;
                e.preventDefault();
                break;

            case "Home": next = 0; e.preventDefault(); break;
            case "End": next = last; e.preventDefault(); break;
            default: return;
        }

        setFocusIdx(next);
        tabRefs.current[next]?.focus();
    }

    // panel keyboard nav (Start/Reset ↔ tabs)
    function onPanelKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        const t = e.target as HTMLElement;
        const last = TABS.length - 1;

        if (e.key === "ArrowDown") {
            if (t === startBtnRef.current) {
                // Start → Reset (or Study if Reset is disabled)
                if (!resetDisabled) resetBtnRef.current?.focus();
                else { setFocusIdx(0); tabRefs.current[0]?.focus(); }
                e.preventDefault();
            } else if (t === resetBtnRef.current) {
                // Reset → Study
                setFocusIdx(0); tabRefs.current[0]?.focus();
                e.preventDefault();
            }
        } else if (e.key === "ArrowUp") {
            if (t === resetBtnRef.current) {
                // Reset → Start (or Long if Start disabled)
                if (!startDisabled) startBtnRef.current?.focus();
                else { setFocusIdx(last); tabRefs.current[last]?.focus(); }
                e.preventDefault();
            } else if (t === startBtnRef.current) {
                // Start → Long
                setFocusIdx(last); tabRefs.current[last]?.focus();
                e.preventDefault();
            }
        }
    }


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
                        onKeyDown={onTabsKeyDown}
                    >
                        {TABS.map((key, idx) => {
                            const tabId = `tab-${key}`;
                            const selected = tab === key;
                            const focused = focusIdx === idx;

                            return (
                                <button
                                    key={key}
                                    id={tabId}
                                    role="tab"
                                    aria-selected={selected}
                                    aria-controls="panel-session"
                                    tabIndex={focused ? 0 : -1}
                                    ref={(el) => {
                                        tabRefs.current[idx] = el;
                                    }}
                                    type="button"
                                    onClick={() => {
                                        switchTab(key); // activate on click
                                        setFocusIdx(idx); // keep roving focus in sync
                                    }}
                                    className={cx(
                                        "relative block w-full text-left px-3 py-2 bg-transparent rounded-none text-white",
                                        "hover:bg-white/5 transition",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
                                        selected &&
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
                    onKeyDown={onPanelKeyDown}
                >
                    <div className="mb-6 text-center text-8xl font-bold tabular-nums">
                        {format(secondsLeft)}
                    </div>

                    <div className="flex justify-center gap-3">
                        <PillButton
                            ref={startBtnRef}
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
                            ref={resetBtnRef}
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
            </div>
        </div>
    );
}