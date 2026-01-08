"use client";

import { useState, useEffect, useRef } from "react";
import { Settings } from "@/types/settings";
import { X, Volume2, VolumeX, Bell, BellOff, Clock, Zap, Music, Palette } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cx } from "@/ui/cx";
import { ThemeSelector } from "@/components/settings/ThemeSelector";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onUpdateSettings: (updates: Partial<Settings>) => void;
}

export function SettingsModal({
    isOpen,
    onClose,
    settings,
    onUpdateSettings,
}: SettingsModalProps) {
    // Local state for immediate feedback before saving or just controlling inputs
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    const [activeTab, setActiveTab] = useState<"general" | "appearance">("general");
    const [inputInSeconds, setInputInSeconds] = useState(false);

    // Sync local state when prop changes
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const updateDuration = (key: keyof Settings["durations"], value: number) => {
        const newDurations = { ...localSettings.durations, [key]: value };
        setLocalSettings({ ...localSettings, durations: newDurations });
        onUpdateSettings({ durations: newDurations });
    };

    const updateBehavior = (key: keyof Settings, value: number | boolean) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        onUpdateSettings({ [key]: value });
    };

    const updateSound = (key: keyof Settings["sound"], value: number | boolean) => {
        const newSound = { ...localSettings.sound, [key]: value };
        setLocalSettings({ ...localSettings, sound: newSound });
        onUpdateSettings({ sound: newSound });
    };

    const updateNotifications = (enabled: boolean) => {
        const newNotifs = { ...localSettings.notifications, enabled };
        setLocalSettings({ ...localSettings, notifications: newNotifs });
        onUpdateSettings({ notifications: newNotifs });
    };

    const updateMedia = (enabled: boolean) => {
        const newMedia = { ...localSettings.media, enabled };
        setLocalSettings({ ...localSettings, media: newMedia });
        onUpdateSettings({ media: newMedia });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--text-primary)]/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-[var(--text-primary)]/5">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Settings</h2>
                            <button
                                onClick={onClose}
                                className="text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex border-b border-[var(--text-primary)]/5">
                            <button
                                onClick={() => setActiveTab("general")}
                                className={cx(
                                    "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                                    activeTab === "general" ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70"
                                )}
                            >
                                General
                                {activeTab === "general" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("appearance")}
                                className={cx(
                                    "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                                    activeTab === "appearance" ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70"
                                )}
                            >
                                Appearance
                                {activeTab === "appearance" && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                                )}
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-8 flex-1">
                            {activeTab === "general" && (
                                <>
                                    {/* Timer Durations */}
                                    <section className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[var(--text-primary)]/80 font-medium">
                                                <Clock className="w-4 h-4" />
                                                <h3>Timer Durations</h3>
                                            </div>
                                            <button
                                                onClick={() => setInputInSeconds(!inputInSeconds)}
                                                className="text-xs text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
                                            >
                                                {inputInSeconds ? "Switch to Minutes" : "Switch to Seconds"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label htmlFor="work-duration" className="text-xs text-[var(--text-primary)]/50">Focus ({inputInSeconds ? "sec" : "min"})</label>
                                                <SmartNumberInput
                                                    id="work-duration"
                                                    min={inputInSeconds ? 5 : 0.1}
                                                    max={inputInSeconds ? 7200 : 120}
                                                    step={inputInSeconds ? 1 : 0.5}
                                                    value={inputInSeconds ? Math.round(localSettings.durations.work * 60) : localSettings.durations.work}
                                                    onChange={(val) => {
                                                        updateDuration("work", inputInSeconds ? val / 60 : val);
                                                    }}
                                                    className="w-full bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 rounded-lg p-3 text-center text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/30 transition-all font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="short-break-duration" className="text-xs text-[var(--text-primary)]/50">Short Break ({inputInSeconds ? "sec" : "min"})</label>
                                                <SmartNumberInput
                                                    id="short-break-duration"
                                                    min={inputInSeconds ? 5 : 0.1}
                                                    max={inputInSeconds ? 3600 : 60}
                                                    step={inputInSeconds ? 1 : 0.5}
                                                    value={inputInSeconds ? Math.round(localSettings.durations.shortBreak * 60) : localSettings.durations.shortBreak}
                                                    onChange={(val) => {
                                                        updateDuration("shortBreak", inputInSeconds ? val / 60 : val);
                                                    }}
                                                    className="w-full bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 rounded-lg p-3 text-center text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/30 transition-all font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="long-break-duration" className="text-xs text-[var(--text-primary)]/50">Long Break ({inputInSeconds ? "sec" : "min"})</label>
                                                <SmartNumberInput
                                                    id="long-break-duration"
                                                    min={inputInSeconds ? 5 : 0.1}
                                                    max={inputInSeconds ? 3600 : 60}
                                                    step={inputInSeconds ? 1 : 0.5}
                                                    value={inputInSeconds ? Math.round(localSettings.durations.longBreak * 60) : localSettings.durations.longBreak}
                                                    onChange={(val) => {
                                                        updateDuration("longBreak", inputInSeconds ? val / 60 : val);
                                                    }}
                                                    className="w-full bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 rounded-lg p-3 text-center text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--text-primary)]/30 transition-all font-mono"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Behavior */}
                                    <section className="space-y-4 pt-4 border-t border-[var(--text-primary)]/5">
                                        <div className="flex items-center gap-2 text-[var(--text-primary)]/80 font-medium">
                                            <Zap className="w-4 h-4" />
                                            <h3>Behavior</h3>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-primary)]/60">Auto-start Timer</span>
                                            <Toggle
                                                checked={localSettings.autoStart}
                                                onChange={(checked) => updateBehavior("autoStart", checked)}
                                                label="Auto-start Timer"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label htmlFor="long-break-interval" className="text-sm text-[var(--text-primary)]/60">Long Break Interval</label>
                                            <div className="flex items-center gap-3 bg-[var(--text-primary)]/5 rounded-lg p-1">
                                                <input
                                                    id="long-break-interval"
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={localSettings.longBreakInterval}
                                                    onChange={(e) => updateBehavior("longBreakInterval", Number(e.target.value))}
                                                    className="w-16 bg-transparent text-center text-[var(--text-primary)] border-none focus:outline-none font-mono"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Sound */}
                                    <section className="space-y-4 pt-4 border-t border-[var(--text-primary)]/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[var(--text-primary)]/80 font-medium">
                                                {localSettings.sound.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                                <h3>Sound</h3>
                                            </div>
                                            <Toggle
                                                checked={localSettings.sound.enabled}
                                                onChange={(checked) => updateSound("enabled", checked)}
                                                label="Enable Sound"
                                            />
                                        </div>

                                        <div className={cx(
                                            "transition-all duration-300 overflow-hidden space-y-2",
                                            localSettings.sound.enabled ? "opacity-100 max-h-20" : "opacity-30 max-h-0 pointer-events-none"
                                        )}>
                                            <div className="flex items-center gap-4">
                                                <label htmlFor="volume-slider" className="text-xs text-[var(--text-primary)]/50 w-12">Volume</label>
                                                <input
                                                    id="volume-slider"
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.05"
                                                    value={localSettings.sound.volume}
                                                    onChange={(e) => updateSound("volume", parseFloat(e.target.value))}
                                                    className="flex-1 h-1.5 bg-[var(--text-primary)]/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--text-primary)]"
                                                    aria-label="Volume"
                                                />
                                                <span className="text-xs text-[var(--text-primary)]/50 w-8 text-right">
                                                    {Math.round(localSettings.sound.volume * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="pt-4 border-t border-[var(--text-primary)]/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[var(--text-primary)]/80 font-medium">
                                                <Music className="w-4 h-4" />
                                                <h3>Media Dock</h3>
                                            </div>
                                            <Toggle
                                                checked={localSettings.media?.enabled ?? true}
                                                onChange={(checked) => updateMedia(checked)}
                                                label="Enable Media Dock"
                                            />
                                        </div>
                                    </section>

                                    {/* Notifications */}
                                    <section className="pt-4 border-t border-[var(--text-primary)]/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[var(--text-primary)]/80 font-medium">
                                                {localSettings.notifications.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                                <h3>Notifications</h3>
                                            </div>
                                            <Toggle
                                                checked={localSettings.notifications.enabled}
                                                onChange={(checked) => updateNotifications(checked)}
                                                label="Enable Notifications"
                                            />
                                        </div>
                                        {localSettings.notifications.enabled && (
                                            <div className="mt-3 flex justify-end">
                                                <button
                                                    onClick={async () => {
                                                        if (!("Notification" in window)) {
                                                            alert("This browser does not support desktop notifications.");
                                                            return;
                                                        }

                                                        if (Notification.permission === "granted") {
                                                            new Notification("Test Notification", {
                                                                body: "If you see this, it works!",
                                                                icon: "/favicon.svg"
                                                            });
                                                        } else if (Notification.permission !== "denied") {
                                                            const permission = await Notification.requestPermission();
                                                            if (permission === "granted") {
                                                                new Notification("Test Notification", {
                                                                    body: "Permission granted! Notifications will now work.",
                                                                    icon: "/favicon.svg"
                                                                });
                                                            } else {
                                                                alert("Permission was denied. You need to enable notifications in your browser settings for this site.");
                                                            }
                                                        } else {
                                                            alert("Notifications are blocked by your browser settings. Please enable them manually for this site.");
                                                        }
                                                    }}
                                                    className="text-xs text-[var(--text-primary)]/50 hover:text-[var(--text-primary)] underline underline-offset-2"
                                                >
                                                    Send Test Notification
                                                </button>
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}

                            {activeTab === "appearance" && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-[var(--text-primary)]/80 font-medium pb-2 border-b border-[var(--text-primary)]/5">
                                        <Palette className="w-4 h-4" />
                                        <h3>Visual Theme</h3>
                                    </div>
                                    <ThemeSelector />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

// Helper for inputs that allows empty state while typing
function SmartNumberInput({
    value,
    onChange,
    min,
    max,
    step = 1,
    className,
    id
}: {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
    id?: string;
}) {
    const [strVal, setStrVal] = useState(String(value));
    const prevValueRef = useRef(value);

    // Sync from parent ONLY if the parent value actually changed
    useEffect(() => {
        if (value !== prevValueRef.current) {
            setStrVal(String(value));
            prevValueRef.current = value;
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setStrVal(val);

        // Don't push empty to parent regular reducer yet
        if (val === "") return;

        const num = parseFloat(val);
        if (!isNaN(num)) {
            // If min is set, don't push until >= min?
            // Actually, pushing immediately is fine, but maybe inconsistent if min > 0.
            // But let's keep it simple. If valid number, push it.
            // Parent handles logic.
            onChange(num);
        }
    };

    const handleBlur = () => {
        if (strVal === "" || isNaN(parseFloat(strVal))) {
            setStrVal("0");
            onChange(0);
        } else {
            // Optional: Format cleanly on blur (e.g. 5.0 -> 5)
            // But only if it matches value
            const parsed = parseFloat(strVal);
            if (!isNaN(parsed)) {
                setStrVal(String(parsed));
            }
        }
    };

    return (
        <input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={strVal}
            onChange={handleChange}
            onBlur={handleBlur}
            className={className}
        />
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cx(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]/75",
                checked ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/10"
            )}
        >
            <span className="sr-only">Use setting</span>
            <span
                aria-hidden="true"
                className={cx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--text-primary)] shadow ring-0 transition duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}


