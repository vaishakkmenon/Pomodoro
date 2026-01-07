import { cx } from "@/ui/cx";
import type { Phase } from "@/ui/types";
import { Companion } from "./Companion";

interface ProgressBarProps {
    secondsLeft: number;
    totalDuration: number; // in seconds
    phase: Phase;
    isRunning: boolean;
    progress?: number; // Optional explicit progress for multi-task
    phaseKind?: "study" | "shortBreak" | "longBreak"; // Explicit phase kind
}

export function ProgressBar({ secondsLeft, totalDuration, phase, isRunning, progress, phaseKind = "study" }: ProgressBarProps) {
    // Avoid division by zero
    // If explicit progress is provided, use it (0-100). Otherwise calc from seconds
    const progressPercent = progress ?? (totalDuration > 0 ? ((totalDuration - secondsLeft) / totalDuration) * 100 : 0);

    return (
        <div className="relative w-full h-2">
            {/* The Track */}
            <div className="absolute inset-0 bg-[var(--text-primary)]/10 ring-1 ring-[var(--text-primary)]/10 rounded-full backdrop-blur-sm overflow-hidden" />

            {/* The Filled Bar */}
            <div
                className={cx(
                    "absolute inset-y-0 left-0 rounded-l-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]",
                    phase === "focus" ? "bg-[var(--accent-primary)]" : "bg-[var(--accent-break)]"
                )}
                style={{ width: `${progressPercent}%`, borderRadius: progressPercent > 99 ? "9999px" : "9999px 0 0 9999px" }}
            />

            {/* The Floating Companion */}
            <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-linear pointer-events-none"
                style={{ left: `${progressPercent}%` }}
            >
                <Companion phase={phaseKind} isRunning={isRunning} />
            </div>
        </div>
    );
}
