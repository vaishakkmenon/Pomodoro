"use client";

// src/components/timer/Timer.tsx
import { useEffect, useRef, useState } from "react";
import type { Phase } from "@/ui/types";
import { cx } from "@/ui/cx";

import { TABS, LABELS, CATCHUP_MIN_SECONDS, CATCHUP_MAX_SECONDS } from "@/config/timer";
import SidebarTabs from "@/components/timer/SidebarTabs";
import TimeDisplay from "@/components/timer/TimeDisplay";
import TimerControls from "@/components/timer/TimerControls";
import CatchupToast from "@/components/timer/CatchupToast";
import { safeParseJSON } from "@/lib/json";
import { isValidCatchupState, type CatchupCheckState, type TimerState } from "@/types/timer";
import { PERSIST_KEY } from "@/hooks/usePersistence";

import { MusicSettings } from "@/components/spotify/MusicSettings";

import { useSpotifySync } from "@/hooks/useSpotifySync";
import { useSiteAuth } from "@/hooks/useSiteAuth";

// Settings Integration
import { Settings as SettingsIcon } from "lucide-react";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { requestNotificationPermission } from "@/lib/notifications";
import { Settings } from "@/types/settings";
// import { DURATIONS } from "@/config/timer";
import { ProgressBar } from "./ProgressBar";

interface TimerProps {
    timer: TimerState;
    settings: Settings;
    updateSettings: (s: Partial<Settings>) => void;
    primeAudio?: () => void;
}

export default function Timer({ timer, settings, updateSettings, primeAudio = () => { } }: TimerProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);

    // Request notification permission if enabled in settings
    useEffect(() => {
        if (settings.notifications.enabled) {
            requestNotificationPermission();
        }
    }, [settings.notifications.enabled]);

    const {
        tab, secondsLeft, isRunning,
        start, pause, reset, switchTab, setSeconds,
        atFull, isDone, phaseKind,
        applyCatchup, setSyncCallback,
    } = timer;

    // --- Auth & Spotify Integration ---
    const { isPremium } = useSiteAuth();
    const { syncPlayback, isAuthenticated } = useSpotifySync();

    useEffect(() => {
        setSyncCallback(syncPlayback);
    }, [setSyncCallback, syncPlayback]);

    const [menuOpen, setMenuOpen] = useState(false);
    // Spotify menu toggle
    const [spotifyOpen, setSpotifyOpen] = useState(false);

    // ----- Catch-up prompt -----
    const [catchupSec, setCatchupSec] = useState<number | null>(null);
    const catchupSavedAtRef = useRef<number | null>(null);

    useEffect(() => {
        // Can we read localStorage here? Yes.
        const raw = localStorage.getItem(PERSIST_KEY);
        const s = safeParseJSON<CatchupCheckState>(raw, isValidCatchupState);
        if (!s?.running) return;
        const elapsed = Math.floor((Date.now() - s.savedAt) / 1000);
        if (elapsed >= CATCHUP_MIN_SECONDS && elapsed <= CATCHUP_MAX_SECONDS) {
            catchupSavedAtRef.current = s.savedAt;
            setCatchupSec(elapsed);
        }
    }, []);

    const handleApplyCatchup = () => {
        const savedAt = catchupSavedAtRef.current;
        const elapsed = savedAt
            ? Math.floor((Date.now() - savedAt) / 1000)
            : catchupSec;
        applyCatchup(elapsed ?? catchupSec ?? 0);
        catchupSavedAtRef.current = null;
        setCatchupSec(null);
    };

    const handleDismissCatchup = () => {
        catchupSavedAtRef.current = null;
        setCatchupSec(null);
    };

    // ----- Tab focus management -----
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [focusIdx, setFocusIdx] = useState(() => TABS.indexOf(tab));
    useEffect(() => {
        setFocusIdx(TABS.indexOf(tab));
    }, [tab]);

    const startBtnRef = useRef<HTMLButtonElement | null>(null);
    const resetBtnRef = useRef<HTMLButtonElement | null>(null);

    // ----- Derived values -----
    const phaseForAccent: Phase = phaseKind === "study" ? "focus" : "break";
    const chipText = `${LABELS[tab]}${isDone ? " — Finished" : isRunning ? "" : " — Paused"}`;
    const startDisabled = isDone && !isRunning;
    const resetDisabled = atFull;
    const cardMax = menuOpen ? "max-w-xl" : "max-w-lg";

    const chipAccent = isDone
        ? "text-white/80 ring-white/20"
        : phaseForAccent === "focus"
            ? "text-emerald-200 ring-emerald-400/40"
            : "text-sky-200 ring-sky-400/40";

    // Derived values for ProgressBar
    const currentDuration = settings.durations
        ? (tab === "study" ? settings.durations.work
            : tab === "short" ? settings.durations.shortBreak
                : settings.durations.longBreak) * 60
        : 25 * 60; // fallback

    // Functions for keyboard nav omitted for brevity, but they need to exist if referenced. 
    // I will include them to avoid breaking.
    function onTabsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (!menuOpen) return;
        // implementation...
        // Reuse existing logic
        const target = e.target as HTMLElement;
        if (target.getAttribute("role") !== "tab") return;
        const last = TABS.length - 1;
        let next = focusIdx;
        switch (e.key) {
            case "ArrowDown":
                if (focusIdx === last) {
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

    function onPanelKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        const t = e.target as HTMLElement;
        const last = TABS.length - 1;
        if (e.key === "ArrowDown") {
            if (t === startBtnRef.current) {
                if (!resetDisabled) resetBtnRef.current?.focus();
                else if (menuOpen) { setFocusIdx(0); tabRefs.current[0]?.focus(); }
                e.preventDefault();
            } else if (t === resetBtnRef.current && menuOpen) {
                setFocusIdx(0); tabRefs.current[0]?.focus(); e.preventDefault();
            }
        } else if (e.key === "ArrowUp") {
            if (t === resetBtnRef.current) {
                if (!startDisabled) startBtnRef.current?.focus();
                else if (menuOpen) { setFocusIdx(last); tabRefs.current[last]?.focus(); }
                e.preventDefault();
            } else if (t === startBtnRef.current && menuOpen) {
                setFocusIdx(last); tabRefs.current[last]?.focus(); e.preventDefault();
            }
        }
    }

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
                if (active?.getAttribute("role") === "tab") startBtnRef.current?.focus();
            }
        });
    }

    return (
        <div className="flex flex-col gap-4 items-center w-full">
            {/* Integrated Progress Bar - Floating above */}
            <div className={cx("w-full transition-[max-width] duration-700 ease-in-out motion-reduce:transition-none", cardMax)}>
                <ProgressBar
                    secondsLeft={secondsLeft}
                    totalDuration={currentDuration}
                    phase={phaseForAccent}
                />
            </div>

            <div
                className={cx(
                    "relative w-full rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur",
                    "transition-[max-width] duration-700 ease-in-out motion-reduce:transition-none",
                    cardMax
                )}
            >
                {/* Header */}
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

                    <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center gap-2 rounded-md p-2 text-white hover:bg-white/10
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                        title="Open Settings"
                    >
                        <SettingsIcon className="w-5 h-5 text-white/70" />
                        <span className="sr-only">Open Settings</span>
                    </button>
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
                                <TimeDisplay
                                    secondsLeft={secondsLeft}
                                    onTimeChange={setSeconds}
                                    onPause={pause}
                                />
                            </div>
                        </div>

                        <TimerControls
                            phase={phaseForAccent}
                            isRunning={isRunning}
                            startDisabled={startDisabled}
                            resetDisabled={resetDisabled}
                            onStart={start}
                            onPause={pause}
                            onReset={reset}
                            onPrimeAudio={primeAudio}
                            startBtnRef={startBtnRef}
                            resetBtnRef={resetBtnRef}
                        />

                        {/* Spotify Settings Toggle */}
                        {isPremium && isAuthenticated && (
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={() => setSpotifyOpen(!spotifyOpen)}
                                    className="text-sm text-white/50 hover:text-white transition-colors"
                                >
                                    {spotifyOpen ? "Hide Music Settings" : "Show Music Settings"}
                                </button>
                            </div>
                        )}
                    </section>
                </div>

                {/* Catch-up toast */}
                {catchupSec != null && (
                    <CatchupToast
                        elapsedSeconds={catchupSec}
                        onApply={handleApplyCatchup}
                        onDismiss={handleDismissCatchup}
                    />
                )}
            </div>

            {/* Spotify Connect Pill */}


            {/* Spotify Settings Panel */}
            {spotifyOpen && isPremium && isAuthenticated && (
                <div className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
                    <MusicSettings />
                </div>
            )}

            {/* Settings Modal */}
            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={settings}
                onUpdateSettings={updateSettings}
            />
        </div>
    );
}