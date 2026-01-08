
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeConfig, ThemeMode, PresetId, SavedTheme } from "@/types/theme";
import { PRESET_THEMES, DEFAULT_THEME_CONFIG } from "@/config/themes";
import { applyThemeFromConfig, isLight } from "@/lib/themeUtils";
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
    const { isSignedIn } = useUser();
    const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
    const [mounted, setMounted] = useState(false);

    // Load from storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                // Enforce contrast for custom themes
                if (parsed.mode === "custom" && parsed.custom) {
                    const isBgLight = isLight(parsed.custom.background);
                    parsed.custom.foreground = isBgLight ? "#0f172a" : "#ffffff";

                    // Add derived overlay colors directly to the config object if we want, 
                    // or just handle it in applyTheme. For now, applyTheme handles it.
                }

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
                const parsed = serverPrefs as ThemeConfig;
                // Migrate legacy server themes too
                if (parsed.mode === "custom" && parsed.custom && !parsed.custom.foreground) {
                    parsed.custom.foreground = isLight(parsed.custom.background) ? "#0f172a" : "#ffffff";
                }
                setConfig(parsed);
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
                updateUserPreferences(config as unknown as Record<string, unknown>);
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
                foreground: isLight(background) ? "#0f172a" : "#ffffff", // Slate-900 for light mode text
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
        setConfig(prev => {
            const themeToDelete = prev.savedThemes?.find(t => t.id === id);
            const nextSavedThemes = (prev.savedThemes || []).filter(t => t.id !== id);

            // Check if the theme being deleted is the currently active one
            // We match by values since 'custom' mode doesn't store the source ID
            const isActive = prev.mode === "custom" && themeToDelete &&
                prev.custom?.background === themeToDelete.background &&
                prev.custom?.accent === themeToDelete.accent;

            if (isActive) {
                // Revert to default preset
                return {
                    ...DEFAULT_THEME_CONFIG,
                    savedThemes: nextSavedThemes
                };
            }

            return {
                ...prev,
                savedThemes: nextSavedThemes
            };
        });
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

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// ... existing helper ...

