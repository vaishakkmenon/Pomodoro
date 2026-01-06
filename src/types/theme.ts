export type ThemeMode = "preset" | "custom" | "background";

export type PresetId = "midnight" | "ocean" | "forest" | "sunset" | "lavender" | "rose";

export interface ThemeConfig {
    mode: ThemeMode;
    presetId: PresetId;
    custom?: {
        background: string; // Hex
        foreground: string; // Hex (Text)
        accent: string;     // Hex
        accentBreak: string;// Hex (Break Phase)
    };
    image?: {
        url: string;
        overlayOpacity: number; // 0.0 to 1.0
    };
    savedThemes?: SavedTheme[];
}

export interface SavedTheme {
    id: string;
    name: string;
    background: string;
    accent: string;
    accentBreak: string;
    timestamp: number;
}

export interface ThemePreset {
    id: PresetId;
    name: string;
    colors: {
        background: string;
        foreground: string;
        accent: string;
        accentBreak: string;
        card: string;
        secondary: string;
    };
}
