import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useState } from "react";
import { cx } from "@/ui/cx";
import { useTheme } from "@/hooks/useTheme";
import { PRESET_THEMES } from "@/config/themes";

interface CompanionProps {
    phase: "study" | "shortBreak" | "longBreak";
    isRunning: boolean;
}

// Simple helper to check if a color is light or dark
function isLightColor(hex: string) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155; // Standard threshold
}

export function Companion({ isRunning }: CompanionProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dotLottie, setDotLottie] = useState<any>(null);
    const { config } = useTheme();

    // Determine current background color to adjust blending
    let currentBg = "#000000";
    if (config.mode === "preset") {
        const preset = PRESET_THEMES.find(p => p.id === config.presetId);
        if (preset) currentBg = preset.colors.background;
    } else if (config.mode === "custom" && config.custom) {
        currentBg = config.custom.background;
    }

    const isLightBg = isLightColor(currentBg);

    // Control playback via ref
    useEffect(() => {
        if (dotLottie) {
            if (isRunning) {
                dotLottie.play();
            } else {
                dotLottie.pause();
            }
        }
    }, [isRunning, dotLottie]);

    return (
        <div className={cx(
            "w-10 h-10 -translate-y-[60%] -translate-x-1/2", // Adjusted size and position
            "filter drop-shadow-lg transition-transform duration-300",
            !isRunning && "scale-95 opacity-90",
            // Theme adaptation:
            // Dark Mode: Black Lottie BG -> Screen -> Transparent. White Walker -> Visible.
            // Light Mode: Invert (White BG/Black Walker) -> Multiply -> Transparent BG. Black Walker -> Visible.
            isLightBg ? "invert mix-blend-multiply" : "mix-blend-screen"
        )}>
            <DotLottieReact
                src="/animations/Walker_man.lottie"
                loop
                autoplay={isRunning}
                dotLottieRefCallback={setDotLottie}
            />
        </div>
    );
}
