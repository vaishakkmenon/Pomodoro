import { useTheme } from "@/hooks/useTheme";
import cx from "clsx";
import { Check, Lock, Save } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { ColorPicker } from "@/components/ui/ColorPicker";

export function ThemeSelector() {
    const { config, setPreset, setCustomTheme, availablePresets, saveCurrentAsPreset, deleteSavedTheme } = useTheme();
    const { isPremium } = usePremium();

    // For now, Presets are free for everyone.
    // Custom/Image modes will be locked based on Auth/Premium status in the future.

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/70">Select Theme</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Standard Presets */}
                {availablePresets.map((preset) => {
                    const isActive = config.mode === "preset" && config.presetId === preset.id;

                    return (
                        <button
                            key={preset.id}
                            onClick={() => setPreset(preset.id)}
                            className={cx(
                                "relative group flex flex-col items-center gap-2 p-3 rounded-xl transition-all border",
                                isActive
                                    ? "bg-white/10 border-white/30"
                                    : "bg-transparent border-transparent hover:bg-white/5"
                            )}
                        >
                            {/* Color Preview Swatch */}
                            <div
                                className="w-full h-12 rounded-lg shadow-sm flex items-center justify-center relative overflow-hidden"
                                style={{ background: preset.colors.background }}
                            >
                                {/* Accent Strip (Dual) */}
                                <div className="absolute bottom-0 left-0 right-0 h-3 flex">
                                    <div className="flex-1 h-full" style={{ background: preset.colors.accent }} />
                                    <div className="flex-1 h-full" style={{ background: preset.colors.accentBreak || preset.colors.accent }} />
                                </div>

                                {isActive && (
                                    <div className="bg-black/20 backdrop-blur-sm p-1 rounded-full text-white">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            <span className={cx(
                                "text-xs font-medium",
                                isActive ? "text-white" : "text-white/50 group-hover:text-white/80"
                            )}>
                                {preset.name}
                            </span>
                        </button>
                    );
                })}

                {/* Saved Custom Themes (Premium Only) */}
                {isPremium && config.savedThemes?.map((theme) => {
                    // Check if current custom settings match this saved theme
                    const isActive = config.mode === "custom" &&
                        config.custom?.background === theme.background &&
                        config.custom?.accent === theme.accent;

                    return (
                        <div
                            key={theme.id}
                            onClick={() => setCustomTheme(theme.background, theme.accent, theme.accentBreak || theme.accent)}
                            className={cx(
                                "relative group flex flex-col items-center gap-2 p-3 rounded-xl transition-all border cursor-pointer",
                                isActive
                                    ? "bg-white/10 border-white/30"
                                    : "bg-transparent border-transparent hover:bg-white/5"
                            )}
                        >
                            {/* Color Preview Swatch */}
                            <div
                                className="w-full h-12 rounded-lg shadow-sm flex items-center justify-center relative overflow-hidden"
                                style={{ background: theme.background }}
                            >
                                {/* Accent Strip (Dual) */}
                                <div className="absolute bottom-0 left-0 right-0 h-3 flex">
                                    <div className="flex-1 h-full" style={{ background: theme.accent }} />
                                    <div className="flex-1 h-full" style={{ background: theme.accentBreak || theme.accent }} />
                                </div>

                                {isActive && (
                                    <div className="bg-black/20 backdrop-blur-sm p-1 rounded-full text-white">
                                        <Check size={14} strokeWidth={3} />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-center w-full relative">
                                <span className={cx(
                                    "text-xs font-medium truncate max-w-[80%]",
                                    isActive ? "text-white" : "text-white/50 group-hover:text-white/80"
                                )}>
                                    {theme.name}
                                </span>

                                {/* Delete Button (Hover Only) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSavedTheme(theme.id);
                                    }}
                                    className="absolute -right-1 p-1 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Theme"
                                >
                                    &times;
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Premium: Custom Colors */}
            {isPremium && (
                <div className="mt-6 p-4 rounded-xl border border-white/5 bg-white/5 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-white/70">Custom Colors</h4>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <ColorPicker
                                label="Background"
                                color={config.custom?.background || "#000000"}
                                onChange={(c) => setCustomTheme(c, config.custom?.accent || "#10b981", config.custom?.accentBreak || "#38bdf8")}
                            />
                            <ColorPicker
                                label="Focus Accent"
                                color={config.custom?.accent || "#10b981"}
                                onChange={(c) => setCustomTheme(config.custom?.background || "#000000", c, config.custom?.accentBreak || "#38bdf8")}
                            />
                            <div className="col-span-2">
                                <ColorPicker
                                    label="Break Accent"
                                    color={config.custom?.accentBreak || "#38bdf8"}
                                    onChange={(c) => setCustomTheme(config.custom?.background || "#000000", config.custom?.accent || "#10b981", c)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <p className="text-xs text-white/30 italic">Pick your perfect combo.</p>
                            <button
                                onClick={() => saveCurrentAsPreset(`Custom ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}
                                className="text-xs flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors text-white/70"
                            >
                                <Save className="w-3 h-3" /> Save Preset
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>

    );
}
