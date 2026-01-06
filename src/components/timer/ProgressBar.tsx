import { cx } from "@/ui/cx";
import type { Phase } from "@/ui/types";

interface ProgressBarProps {
    secondsLeft: number;
    totalDuration: number; // in seconds
    phase: Phase;
}

export function ProgressBar({ secondsLeft, totalDuration, phase }: ProgressBarProps) {
    // Avoid division by zero
    const progress = totalDuration > 0 ? ((totalDuration - secondsLeft) / totalDuration) * 100 : 0;

    return (
        <div className="relative w-full h-2 bg-white/10 overflow-hidden rounded-full backdrop-blur-sm">
            <div
                className={cx(
                    "h-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]",
                    phase === "focus" ? "bg-[var(--accent-primary)]" : "bg-[var(--accent-break)]"
                )}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
