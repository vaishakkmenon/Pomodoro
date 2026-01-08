import { ThemeConfig } from "@/types/theme";
import { PRESET_THEMES } from "@/config/themes";

export const isLight = (hex: string) => {
    if (!hex) return false;
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    return ((r * 299 + g * 587 + b * 114) / 1000) > 155;
};

export function applyThemeFromConfig(cfg: ThemeConfig) {
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
        root.style.setProperty("--bg-card-overlay", `color-mix(in srgb, ${preset.colors.foreground}, transparent 95%)`);
        root.style.setProperty("--border-card-overlay", `color-mix(in srgb, ${preset.colors.foreground}, transparent 90%)`);
    } else if (cfg.mode === "custom" && cfg.custom) {
        root.style.setProperty("--bg-main", cfg.custom.background);
        root.style.setProperty("--text-primary", cfg.custom.foreground);
        root.style.setProperty("--accent-primary", cfg.custom.accent);
        root.style.setProperty("--accent-break", cfg.custom.accentBreak || cfg.custom.accent);
        root.style.setProperty("--bg-card", `color-mix(in srgb, ${cfg.custom.background}, transparent 50%)`);
        root.style.setProperty("--bg-secondary", cfg.custom.background);

        // Manual glass tuning
        const isBgLight = isLight(cfg.custom.background);
        if (isBgLight) {
            // Clean light mode glass: Significant black tint (12%) with stronger border
            root.style.setProperty("--bg-card-overlay", "rgba(0, 0, 0, 0.12)");
            root.style.setProperty("--border-card-overlay", "rgba(0, 0, 0, 0.15)");
        } else {
            // Standard dark mode glass: Faint white tint
            root.style.setProperty("--bg-card-overlay", "rgba(255, 255, 255, 0.05)");
            root.style.setProperty("--border-card-overlay", "rgba(255, 255, 255, 0.1)");
        }
    }
}
