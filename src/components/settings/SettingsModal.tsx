"use client";

import { useState, useEffect } from "react";
import { Settings } from "@/types/settings";
import { X, Volume2, VolumeX, Bell, BellOff, Clock, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cx } from "@/ui/cx";

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
                        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h2 className="text-xl font-bold text-white">Settings</h2>
                            <button
                                onClick={onClose}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-8 flex-1">
                            {/* Timer Durations */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-white/80 font-medium">
                                    <Clock className="w-4 h-4" />
                                    <h3>Timer Durations (minutes)</h3>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-white/50">Focus</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={localSettings.durations.work}
                                            onChange={(e) => updateDuration("work", Number(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-center text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-white/50">Short Break</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={localSettings.durations.shortBreak}
                                            onChange={(e) => updateDuration("shortBreak", Number(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-center text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-white/50">Long Break</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={localSettings.durations.longBreak}
                                            onChange={(e) => updateDuration("longBreak", Number(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-center text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Behavior */}
                            <section className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 text-white/80 font-medium">
                                    <Zap className="w-4 h-4" />
                                    <h3>Behavior</h3>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-white/60">Long Break Interval</label>
                                    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-1">
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={localSettings.longBreakInterval}
                                            onChange={(e) => updateBehavior("longBreakInterval", Number(e.target.value))}
                                            className="w-16 bg-transparent text-center text-white border-none focus:outline-none font-mono"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Sound */}
                            <section className="space-y-4 pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/80 font-medium">
                                        {localSettings.sound.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                        <h3>Sound</h3>
                                    </div>
                                    <Toggle
                                        checked={localSettings.sound.enabled}
                                        onChange={(checked) => updateSound("enabled", checked)}
                                    />
                                </div>

                                <div className={cx(
                                    "transition-all duration-300 overflow-hidden space-y-2",
                                    localSettings.sound.enabled ? "opacity-100 max-h-20" : "opacity-30 max-h-0 pointer-events-none"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-white/50 w-12">Volume</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={localSettings.sound.volume}
                                            onChange={(e) => updateSound("volume", parseFloat(e.target.value))}
                                            className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                                        />
                                        <span className="text-xs text-white/50 w-8 text-right">
                                            {Math.round(localSettings.sound.volume * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* Notifications */}
                            <section className="pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/80 font-medium">
                                        {localSettings.notifications.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                        <h3>Notifications</h3>
                                    </div>
                                    <Toggle
                                        checked={localSettings.notifications.enabled}
                                        onChange={(checked) => updateNotifications(checked)}
                                    />
                                </div>
                            </section>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cx(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75",
                checked ? "bg-emerald-500" : "bg-white/10"
            )}
        >
            <span className="sr-only">Use setting</span>
            <span
                aria-hidden="true"
                className={cx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}
