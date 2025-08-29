// src/components/timer/Timer.tsx
import { useEffect, useRef, useState } from "react";
import PillButton from "@/components/ui/PillButton";
import type { Phase } from "@/ui/types";
import { cx } from "@/ui/cx";
import { useChime } from "@/hooks/useChime";
import { TABS, LABELS } from "@/config/timer";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { formatTime } from "@/lib/time";

// Presentation-only (keep local)
const ITEM_H = 40; // matches h-10
const GAP = 8;     // matches gap-2

export default function Timer() {
    // use the timer engine, and chime only when a study session completes
    const { play: playChime, prime: primeAudio } = useChime("/sounds/windchimes.mp3", 0.28);
    // AFTER
    const {
        tab, secondsLeft, isRunning,
        start, pause, reset, switchTab, setSeconds,
        atFull, isDone, phaseKind, statusText: statusGeneric,
    } = usePomodoroTimer({ onComplete: (prev) => prev === "study" && playChime() });

    const [menuOpen, setMenuOpen] = useState(false);

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

    // keep your original chip copy (includes the label), or use the hook’s generic text
    const chipText = statusGeneric;

    // disabled states now use the hook flags
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
        // keep only the first colon
        return cleaned.slice(0, first + 1) + cleaned.slice(first + 1).replace(/:/g, "");
    }

    // Flexible parser:
    // - "MM:SS"  (SS 00–59)
    // - digits-only length <= 2 => minutes
    // - digits-only length >= 3 => (all but last 2) minutes + (last 2) seconds
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
        if (s.length <= 2) {
            // treat as minutes
            const mins = parseInt(s, 10);
            return mins * 60;
        }
        // length >= 3 → last two digits are seconds
        const secs = parseInt(s.slice(-2), 10);
        if (secs >= 60) return null;
        const mins = parseInt(s.slice(0, -2) || "0", 10);
        return mins * 60 + secs;
    }

    function commitEdit() {
        const total = parseFlexibleTime(input);
        if (total == null) {
            setInputError(true);
            return; // keep editing until valid
        }
        setInputError(false);
        pause();       // from hook
        setSeconds(total); // from hook (clamps & pauses)
        setEditing(false);
    }


    // tablist keyboard nav (Up/Down inside tabs; handoff at edges)
    function onTabsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (!menuOpen) return; // no tabs when closed
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
                    // Study → Reset → Start → Long (skip disabled)
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
                return; // don't swallow Enter/Space/Tab
        }

        setFocusIdx(next);
        tabRefs.current[next]?.focus();
    }

    // panel keyboard nav (Start/Reset ↔ tabs when open; bounce between buttons when closed)
    function onPanelKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        const t = e.target as HTMLElement;
        const last = TABS.length - 1;

        if (e.key === "ArrowDown") {
            if (t === startBtnRef.current) {
                // Start → Reset (or Study if Reset disabled)
                if (!resetDisabled) resetBtnRef.current?.focus();
                else if (menuOpen) {
                    setFocusIdx(0);
                    tabRefs.current[0]?.focus();
                }
                e.preventDefault();
            } else if (t === resetBtnRef.current) {
                // Reset → Study (if menu open), otherwise do nothing
                if (menuOpen) {
                    setFocusIdx(0);
                    tabRefs.current[0]?.focus();
                    e.preventDefault();
                }
            }
        } else if (e.key === "ArrowUp") {
            if (t === resetBtnRef.current) {
                // Reset → Start (or Long if Start disabled)
                if (!startDisabled) startBtnRef.current?.focus();
                else if (menuOpen) {
                    setFocusIdx(last);
                    tabRefs.current[last]?.focus();
                }
                e.preventDefault();
            } else if (t === startBtnRef.current) {
                // Start → Long (if menu open)
                if (menuOpen) {
                    setFocusIdx(last);
                    tabRefs.current[last]?.focus();
                    e.preventDefault();
                }
            }
        }
    }

    // toggling menu: keep your same focus behavior
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
            {/* Header with hamburger + inline status (unchanged visuals) */}
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
                <nav
                    id="sidebar-tabs"
                    aria-label="Session modes"
                    aria-hidden={!menuOpen}
                    className={cx(
                        "self-stretch overflow-hidden",
                        "transition-[width,opacity] duration-700 ease-in-out motion-reduce:transition-none",
                        menuOpen ? "w-36 opacity-100" : "w-0 opacity-0 pointer-events-none"
                    )}
                >
                    <div className="w-36 flex-none">
                        <div
                            role="tablist"
                            aria-orientation="vertical"
                            onKeyDown={onTabsKeyDown}
                            className="relative rounded-2xl"
                        >
                            {/* Thumb: outline only, spans wrapper exactly */}
                            <div
                                aria-hidden
                                className={cx(
                                    "pointer-events-none absolute left-[3px] right-[3px] top-0 rounded-full box-border",
                                    "border transition-transform duration-300 ease-out",
                                    tab === "study" ? "border-emerald-300/40" : "border-sky-300/40"
                                )}
                                style={{
                                    height: ITEM_H, // 40 (h-10)
                                    transform: `translateY(${TABS.indexOf(tab) * (ITEM_H + GAP)}px)`,
                                }}
                            />

                            {/* Buttons */}
                            <div className="relative z-10 flex flex-col gap-2">
                                {TABS.map((key, idx) => {
                                    const tabId = `tab-${key}`;
                                    const selected = tab === key;
                                    const focused = focusIdx === idx;
                                    const isStudy = key === "study";

                                    return (
                                        <div key={key} className="relative rounded-full px-[3px] overflow-hidden">
                                            <button
                                                id={tabId}
                                                role="tab"
                                                aria-selected={selected}
                                                aria-controls="panel-session"
                                                tabIndex={menuOpen && focused ? 0 : -1}
                                                ref={(el) => { tabRefs.current[idx] = el; }}
                                                type="button"
                                                onClick={() => { switchTab(key); setFocusIdx(idx); }}
                                                className={cx(
                                                    "relative inline-flex w-full items-center justify-center text-center", // ← center horizontally
                                                    "h-10 px-4 whitespace-nowrap rounded-[inherit]",
                                                    selected ? (isStudy ? "bg-emerald-400/10" : "bg-sky-400/10") : "bg-transparent",
                                                    "text-white/80 hover:text-white transition-colors",
                                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ring-inset",
                                                    selected && "text-white"
                                                )}
                                            >
                                                <span className="truncate">{LABELS[key]}</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Timer panel (unchanged visuals) */}
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
                                        // live-validate to clear the red state as soon as it's valid
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
            </div >
        </div >
    );
}