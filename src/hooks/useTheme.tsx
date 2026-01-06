// eslint-disable-next-line react-refresh/only-export-components  
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeConfig, ThemeMode, PresetId, SavedTheme } from "@/types/theme";
import { PRESET_THEMES, DEFAULT_THEME_CONFIG } from "@/config/themes";
import { useUser } from "@clerk/nextjs";
import { getUserPreferences, updateUserPreferences } from "@/app/actions/user";

const STORAGE_KEY = "pomodoro:theme:v1";

interface ThemeContextType {
    config: ThemeConfig;
    setThemeMode: (mode: ThemeMode) => void;
    setPreset: (presetId: PresetId) => void;
    setCustomTheme: (background: string, accent: string, accentBreak: string) => void;
    saveCurrentAsPreset: (name: string) => void;
    deleteSavedTheme: (id: string) => void;
    availablePresets: typeof PRESET_THEMES;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user, isSignedIn } = useUser();
    const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
    const [mounted, setMounted] = useState(false);

    // Load from storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setConfig(parsed);
                applyThemeFromConfig(parsed);
            } catch (e) {
                console.error("Failed to parse theme settings", e);
            }
        } else {
            applyThemeFromConfig(DEFAULT_THEME_CONFIG);
        }
        setMounted(true);
    }, []);

    // Fetch from server on login
    useEffect(() => {
        if (!isSignedIn) return;

        const fetchServerPrefs = async () => {
            const serverPrefs = await getUserPreferences();
            if (serverPrefs) {
                setConfig(serverPrefs as ThemeConfig);
            }
        };
        fetchServerPrefs();
    }, [isSignedIn]);

    // Save to storage and Apply CSS Variables when config changes
    // Debounce server save to avoid flooding DB during color picking
    useEffect(() => {
        if (!mounted) return;

        // 1. Local persist (Sync, immediate)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        applyThemeFromConfig(config);

        // 2. Server persist (Debounced)
        if (isSignedIn) {
            const timer = setTimeout(() => {
                updateUserPreferences(config);
            }, 1000); // 1 second debounce
            return () => clearTimeout(timer);
        }
    }, [config, mounted, isSignedIn]);

    const setThemeMode = (mode: ThemeMode) => {
        setConfig(prev => ({ ...prev, mode }));
    };

    const setPreset = (presetId: PresetId) => {
        setConfig(prev => ({ ...prev, mode: "preset", presetId }));
    };

    const setCustomTheme = (background: string, accent: string, accentBreak: string) => {
        const customConfig: ThemeConfig = {
            ...config,
            mode: "custom",
            custom: {
                background,
                accent,
                accentBreak,
                foreground: "#ffffff",
            }
        };
        setConfig(customConfig);
    };

    const saveCurrentAsPreset = (name: string) => {
        if (config.mode !== "custom" || !config.custom) return;

        const newSaved: SavedTheme = {
            id: crypto.randomUUID(),
            name,
            background: config.custom.background,
            accent: config.custom.accent,
            accentBreak: config.custom.accentBreak || config.custom.accent, // Fallback
            timestamp: Date.now(),
        };

        setConfig(prev => ({
            ...prev,
            savedThemes: [...(prev.savedThemes || []), newSaved]
        }));
    };

    const deleteSavedTheme = (id: string) => {
        setConfig(prev => ({
            ...prev,
            savedThemes: (prev.savedThemes || []).filter(t => t.id !== id)
        }));
    };

    return (
        <ThemeContext.Provider value={{
            config,
            setThemeMode,
            setPreset,
            setCustomTheme,
            saveCurrentAsPreset,
            deleteSavedTheme,
            availablePresets: PRESET_THEMES
        }
        }>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// ... existing helper ...
function applyThemeFromConfig(cfg: ThemeConfig) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    if (cfg.mode === "preset") {
        const preset = PRESET_THEMES.find(p => p.id === cfg.presetId) || PRESET_THEMES[0];
        root.style.setProperty("--bg-main", preset.colors.background);
        root.style.setProperty("--text-primary", preset.colors.foreground);
        root.style.setProperty("--accent-primary", preset.colors.accent);
        root.style.setProperty("--accent-break", preset.colors.accentBreak || preset.colors.accent);
        root.style.setProperty("--bg-card", preset.colors.card);
        root.style.setProperty("--bg-secondary", preset.colors.secondary);
    } else if (cfg.mode === "custom" && cfg.custom) {
        root.style.setProperty("--bg-main", cfg.custom.background);
        root.style.setProperty("--text-primary", cfg.custom.foreground);
        root.style.setProperty("--accent-primary", cfg.custom.accent);
        root.style.setProperty("--accent-break", cfg.custom.accentBreak || cfg.custom.accent);
        root.style.setProperty("--bg-card", `${cfg.custom.background}80`);
        root.style.setProperty("--bg-secondary", cfg.custom.background);
    }
}
