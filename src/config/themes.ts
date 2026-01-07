import { ThemePreset } from "@/types/theme";

export const PRESET_THEMES: ThemePreset[] = [
    {
        id: "midnight",
        name: "Midnight",
        colors: {
            background: "#18181b", // zinc-900
            foreground: "#ffffff",
            accent: "#10b981",     // emerald-500
            accentBreak: "#38bdf8",// sky-400
            card: "rgba(255, 255, 255, 0.05)",
            secondary: "#3f3f46"   // zinc-700
        }
    },
    {
        id: "ocean",
        name: "Ocean",
        colors: {
            background: "#0f172a", // slate-900
            foreground: "#f8fafc", // slate-50
            accent: "#38bdf8",     // sky-400
            accentBreak: "#818cf8",// indigo-400
            card: "rgba(15, 23, 42, 0.4)",
            secondary: "#1e293b"   // slate-800
        }
    },
    {
        id: "forest",
        name: "Forest",
        colors: {
            background: "#052e16", // green-950
            foreground: "#f0fdf4", // green-50
            accent: "#86efac",     // green-300
            accentBreak: "#5eead4",// teal-300
            card: "rgba(5, 46, 22, 0.4)",
            secondary: "#14532d"   // green-900
        }
    },
    {
        id: "sunset",
        name: "Sunset",
        colors: {
            background: "#450a0a", // red-950
            foreground: "#fef2f2", // red-50
            accent: "#fdba74",     // orange-300
            accentBreak: "#fca5a5",// red-300
            card: "rgba(69, 10, 10, 0.4)",
            secondary: "#7f1d1d"   // red-900
        }
    },
    {
        id: "lavender",
        name: "Lavender",
        colors: {
            background: "#2e1065", // violet-950
            foreground: "#faf5ff", // violet-50
            accent: "#d8b4fe",     // violet-300
            accentBreak: "#f0abfc",// fuchsia-300
            card: "rgba(46, 16, 101, 0.4)",
            secondary: "#5b21b6"   // violet-800
        }
    },
    {
        id: "rose",
        name: "Rose",
        colors: {
            background: "#4c0519", // rose-950
            foreground: "#fff1f2", // rose-50
            accent: "#fda4af",     // rose-300
            accentBreak: "#f9a8d4",// pink-300
            card: "rgba(76, 5, 25, 0.4)",
            secondary: "#881337"   // rose-900
        }
    }
];

export const DEFAULT_THEME_CONFIG: { mode: "preset"; presetId: "midnight" } = {
    mode: "preset",
    presetId: "midnight"
};
