import { useState, useEffect, useCallback } from "react";
import { Settings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/config/defaults";

const STORAGE_KEY = "pomodoro:settings:v1";

export function useSettings() {
    // Start with defaults. We'll hydrate in useEffect.
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                // Merge with defaults to ensure schema consistency
                const merged: Settings = {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    durations: {
                        ...DEFAULT_SETTINGS.durations,
                        ...(parsed.durations || {}),
                    },
                    sound: {
                        ...DEFAULT_SETTINGS.sound,
                        ...(parsed.sound || {}),
                    },
                    notifications: {
                        ...DEFAULT_SETTINGS.notifications,
                        ...(parsed.notifications || {}),
                    },
                    media: {
                        ...DEFAULT_SETTINGS.media,
                        ...(parsed.media || {}),
                    },
                };
                setSettings(merged);
            } catch (error) {
                console.error("Failed to parse settings:", error);
                // Fallback to defaults is already set
            }
        }
    }, []);

    const updateSettings = useCallback((updates: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...updates };
            // Persist immediately
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }, []);

    return { settings, updateSettings, resetSettings };
}
