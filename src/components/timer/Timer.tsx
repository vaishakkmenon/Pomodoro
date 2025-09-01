// src/components/timer/Timer.tsx
import { useEffect, useRef, useState } from "react";
import PillButton from "@/components/ui/PillButton";
import type { Phase } from "@/ui/types";
import { cx } from "@/ui/cx";
import { useChime } from "@/hooks/useChime";
import { TABS, LABELS } from "@/config/timer";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { formatTime } from "@/lib/time";
import SidebarTabs from "@/components/timer/SidebarTabs";
import { usePersistence, PERSIST_KEY } from "@/hooks/usePersistence";

export default function Timer() {
    // chime only when a study session completes
    const { play: playChime, prime: primeAudio } = useChime("/sounds/windchimes.mp3", 0.28);

    const {
        tab, secondsLeft, isRunning,
        start, pause, reset, switchTab, setSeconds,
        atFull, isDone, phaseKind,
        applyCatchup, // <-- NEW: use catch-up from the hook
    } = usePomodoroTimer({ onComplete: (prev) => prev === "study" && playChime() });

    usePersistence({ tab, secondsLeft, isRunning, switchTab, setSeconds, start, pause }, PERSIST_KEY, {
        // saveThrottleMs: 1000,
        // clampSeconds: (tab, secs) => Math.max(0, Math.min(DURATIONS[tab], secs)),
    });

    const [menuOpen, setMenuOpen] = useState(false);

    // ----- Catch-up prompt (paused on load; starts after Apply) -----
    const [catchupSec, setCatchupSec] = useState<number | null>(null);
    const MIN_ELAPSED = 10;        // show if away ≥ 10s
    const MAX_ELAPSED = 10 * 60;   // and ≤ 10 minutes

    useEffect(() => {
        try {
            const raw = localStorage.getItem(PERSIST_KEY);
            if (!raw) return;
            const s = JSON.parse(raw) as { running?: boolean; savedAt?: number };
            if (!s?.running || !s?.savedAt) return;
            const elapsed = Math.floor((Date.now() - s.savedAt) / 1000);
            if (elapsed >= MIN_ELAPSED && elapsed <= MAX_ELAPSED) {
                setCatchupSec(elapsed);
            }
        } catch { /* ignore */ }
    }, []);
    // ---------------------------------------------------------------

    // tab focus management (unchanged)
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [focusIdx, setFocusIdx] = useState(() => TABS.indexOf(tab));
    useEffect(() => {
        setFocusIdx(TABS.indexOf(tab));
    }, [tab]);

    // focusable controls on the panel
    const startBtnRef = useRef<HTMLButtonElement | null>(null);
    const resetBtnRef = useRef<HTMLButtonElement | null>(null);

    // map neutral phaseKind ("study" | "break") to your UI Phase ("focus" | "break")
    const phaseForAccent: Phase = phaseKind === "study" ? "focus" : "break";

    // keep your original chip copy
    const chipText = `${LABELS[tab]}${isDone ? " — Finished" : isRunning ? "" : " — Paused"}`;

    // disabled states
    const startDisabled = isDone && !isRunning;
    const resetDisabled = atFull;

    const cardMax = menuOpen ? "max-w-xl" : "max-w-lg";

    const chipAccent =
        isDone
            ? "text-white/80 ring-white/20"
            : phaseForAccent === "focus"
                ? "text-emerald-200 ring-emerald-400/40"
                : "text-sky-200 ring-sky-400/40";

    // Editing state
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState("");
    const [inputError, setInputError] = useState(false);

    // Allow only digits and a single colon while typing
    function sanitizeTimeInput(s: string) {
        const cleaned = s.replace(/[^\d:]/g, "");
        const first = cleaned.indexOf(":");
        if (first === -1) return cleaned;
        return cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/:/g, "");
    }

    // Flexible parser: "MM:SS" or digits (e.g. 2530 -> 25:30, 30 -> 30:00)
    function parseFlexibleTime(raw: string): number | null {
        const s = raw.trim();
        if (!s) return null;

        if (s.includes(":")) {
            const [mm, ss] = s.split(":");
            if (!/^\d{1,3}$/.test(mm || "") || !/^\d{1,2}$/.test(ss || "")) return null;
            const mins = parseInt(mm, 10);
            const secs = parseInt(ss, 10);
            if (secs >= 60) return null;
            return mins * 60 + secs;
        }

        if (!/^\d+$/.test(s)) return null;
        if (s.length <= 2) return parseInt(s, 10) * 60;
        const secs = parseInt(s.slice(-2), 10);
        if (secs >= 60) return null;
        const mins = parseInt(s.slice(0, -2) || "0", 10);
        return mins * 60 + secs;
    }

    function commitEdit() {
        const total = parseFlexibleTime(input);
        if (total == null) {
            setInputError(true);
            return;
        }
        setInputError(false);
        pause();
        setSeconds(total);
        setEditing(false);
    }

    // tablist keyboard nav (unchanged)
    function onTabsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (!menuOpen) return;
        const target = e.target as HTMLElement;
        if (target.getAttribute("role") !== "tab") return;

        const last = TABS.length - 1;
        let next = focusIdx;

        switch (e.key) {
            case "ArrowDown":
                if (focusIdx === last) {
                    if (!startDisabled) startBtnRef.current?.focus();
                    else if (!resetDisabled) resetBtnRef.current?.focus();
                    else {
                        setFocusIdx(0);
                        tabRefs.current[0]?.focus();
                    }
                    e.preventDefault();
                    return;
                }
                next = focusIdx + 1;
                e.preventDefault();
                break;
            case "ArrowUp":
                if (focusIdx === 0) {
                    if (!resetDisabled) resetBtnRef.current?.focus();
                    else if (!startDisabled) startBtnRef.current?.focus();
                    else {
                        setFocusIdx(last);
                        tabRefs.current[last]?.focus();
                    }
                    e.preventDefault();
                    return;
                }
                next = focusIdx - 1;
                e.preventDefault();
                break;
            case "Home":
                next = 0;
                e.preventDefault();
                break;
            case "End":
                next = last;
                e.preventDefault();
                break;
            default:
                return;
        }

        setFocusIdx(next);
        tabRefs.current[next]?.focus();
    }

    // panel keyboard nav (unchanged)
    function onPanelKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        const t = e.target as HTMLElement;
        const last = TABS.length - 1;

        if (e.key === "ArrowDown") {
            if (t === startBtnRef.current) {
                if (!resetDisabled) resetBtnRef.current?.focus();
                else if (menuOpen) {
                    setFocusIdx(0);
                    tabRefs.current[0]?.focus();
                }
                e.preventDefault();
            } else if (t === resetBtnRef.current) {
                if (menuOpen) {
                    setFocusIdx(0);
                    tabRefs.current[0]?.focus();
                    e.preventDefault();
                }
            }
        } else if (e.key === "ArrowUp") {
            if (t === resetBtnRef.current) {
                if (!startDisabled) startBtnRef.current?.focus();
                else if (menuOpen) {
                    setFocusIdx(last);
                    tabRefs.current[last]?.focus();
                }
                e.preventDefault();
            } else if (t === startBtnRef.current) {
                if (menuOpen) {
                    setFocusIdx(last);
                    tabRefs.current[last]?.focus();
                    e.preventDefault();
                }
            }
        }
    }

    // toggling menu (unchanged)
    function toggleMenu() {
        const next = !menuOpen;
        setMenuOpen(next);
        requestAnimationFrame(() => {
            if (next) {
                const idx = TABS.indexOf(tab);
                setFocusIdx(idx);
                tabRefs.current[idx]?.focus();
            } else {
                const active = document.activeElement as HTMLElement | null;
                if (active?.getAttribute("role") === "tab") {
                    startBtnRef.current?.focus();
                }
            }
        });
    }

    return (
        <div
            className={cx(
                "w-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur",
                "transition-[max-width] duration-700 ease-in-out motion-reduce:transition-none",
                cardMax
            )}
        >
            {/* Header with hamburger + inline status */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleMenu}
                        aria-expanded={menuOpen}
                        aria-controls="sidebar-tabs"
                        className="inline-flex items-center gap-2 rounded-md p-2 text-white hover:bg-white/10
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                        title={menuOpen ? "Hide session tabs" : "Show session tabs"}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <rect x="3" y="6" width="18" height="2" rx="1" />
                            <rect x="3" y="11" width="18" height="2" rx="1" />
                            <rect x="3" y="16" width="18" height="2" rx="1" />
                        </svg>
                        <span className="sr-only">Toggle session menu</span>
                    </button>
                </div>
            </div>

            <div className={cx("flex transition-[gap] duration-700 ease-in-out", menuOpen ? "gap-6" : "gap-0")}>
                <SidebarTabs
                    open={menuOpen}
                    tab={tab}
                    focusIdx={focusIdx}
                    setFocusIdx={setFocusIdx}
                    switchTab={switchTab}
                    onTabsKeyDown={onTabsKeyDown}
                    tabRefs={tabRefs}
                />

                {/* Timer panel */}
                <section
                    id="panel-session"
                    role="tabpanel"
                    aria-labelledby={`tab-${tab}`}
                    className="flex-1"
                    onKeyDown={onPanelKeyDown}
                >
                    <div className="flex flex-col items-center -mt-1 md:-mt-8 gap-4 mb-6">
                        <div
                            aria-live="polite"
                            className={cx(
                                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
                                "ring-1 transition-colors",
                                chipAccent
                            )}
                        >
                            {chipText}
                        </div>

                        <div className="text-8xl font-bold tabular-nums leading-none">
                            {!editing ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setInput(formatTime(secondsLeft));
                                        setInputError(false);
                                        setEditing(true);
                                    }}
                                    className="inline-block min-w-[6ch] text-center align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 rounded"
                                    title="Click to edit time (MM:SS). You can also type 2530 → 25:30 or 30 → 30:00"
                                >
                                    {formatTime(secondsLeft)}
                                </button>
                            ) : (
                                <input
                                    autoFocus
                                    value={input}
                                    onChange={(e) => {
                                        const v = sanitizeTimeInput(e.target.value);
                                        setInput(v);
                                        setInputError(parseFlexibleTime(v) == null);
                                    }}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onBlur={commitEdit}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") commitEdit();
                                        else if (e.key === "Escape") setEditing(false);
                                    }}
                                    className={cx(
                                        "inline-block w-[6ch] text-center bg-transparent border-b outline-none caret-white align-middle",
                                        inputError ? "border-red-400 focus:border-red-400" : "border-white/20 focus:border-white/40"
                                    )}
                                    inputMode="numeric"
                                    aria-label="Edit timer (MM:SS or digits like 2530)"
                                    placeholder="MM:SS"
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center gap-3">
                        <PillButton
                            ref={startBtnRef}
                            type="button"
                            phase={phaseForAccent}
                            onClick={() => {
                                primeAudio();
                                isRunning ? pause() : start();
                            }}
                            aria-pressed={isRunning}
                            className="min-w-28 justify-center !text-lg !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={startDisabled}
                        >
                            {isRunning ? "Pause" : "Start"}
                        </PillButton>

                        <PillButton
                            ref={resetBtnRef}
                            type="button"
                            phase={phaseForAccent}
                            variant="danger"
                            onClick={() => reset()}
                            className="min-w-28 justify-center !text-lg !px-4 !py-2"
                            disabled={resetDisabled}
                            title={resetDisabled ? "Already reset" : "Reset timer"}
                        >
                            Reset
                        </PillButton>
                    </div>
                </section>
            </div>

            {/* Catch-up toast */}
            {catchupSec != null && (
                <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
                    <div className="rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-3 shadow-lg backdrop-blur">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-white">
                                You were away for <span className="font-semibold">{formatTime(catchupSec)}</span>. Apply catch-up?
                            </span>
                            <div className="flex gap-2">
                                <button
                                    className="rounded-md bg-emerald-600/90 px-3 py-1.5 text-sm text-white hover:bg-emerald-600"
                                    onClick={() => {
                                        try {
                                            const raw = localStorage.getItem(PERSIST_KEY);
                                            const s = raw ? (JSON.parse(raw) as { savedAt?: number }) : {};
                                            const nowElapsed =
                                                s?.savedAt ? Math.floor((Date.now() - s.savedAt) / 1000) : catchupSec;
                                            applyCatchup(nowElapsed ?? catchupSec); // starts running after apply
                                        } catch {
                                            applyCatchup(catchupSec);
                                        }
                                        setCatchupSec(null);
                                    }}
                                >
                                    Apply
                                </button>
                                <button
                                    className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                                    onClick={() => setCatchupSec(null)}
                                >
                                    Keep time
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}