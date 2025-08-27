import { useState } from "react";

function format(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export default function Timer() {
    const [phase, setPhase] = useState<"focus" | "break">("focus");
    const [secondsLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);

    const pillBase =
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white leading-none " +
        "active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2";

    const phaseAccent =
        phase === "focus"
            ? "bg-emerald-500/10 hover:bg-emerald-400/20 focus-visible:ring-emerald-400/40"
            : "bg-sky-500/10 hover:bg-sky-400/20 focus-visible:ring-sky-400/40";

    return (
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="mb-4 text-center">
                <div className="mb-6 text-center text-8xl font-bold tabular-nums">
                    {format(secondsLeft)}
                </div>

                <div className="flex justify-center gap-3">
                    {/* Start/Pause — same base + accent + extra width/centering */}
                    <button
                        type="button"
                        onClick={() => setIsRunning(v => !v)}
                        aria-pressed={isRunning}
                        className={`${pillBase} ${phaseAccent} min-w-12 justify-center`}
                    >
                        {isRunning ? "Pause" : "Start"}
                    </button>

                    {/* Focus/Break — same base + accent */}
                    <button
                        type="button"
                        aria-pressed={phase === "break"}
                        onClick={() => setPhase(p => (p === "focus" ? "break" : "focus"))}
                        className={`${pillBase} ${phaseAccent} min-w-12`}
                    >
                        <span className={`h-2 w-2 rounded-full ${phase === "focus" ? "bg-emerald-400" : "bg-sky-400"}`} />
                        {phase === "focus" ? "Focus" : "Break"}
                    </button>
                </div>
            </div>
        </div>
    );
}