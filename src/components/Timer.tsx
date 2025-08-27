import { useState } from "react";

export default function Timer() {
    const [phase, setPhase] = useState<"focus" | "break">("focus");

    return (
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="mb-4 text-center">
                <div className="mb-6 text-center text-8xl font-bold tabular-nums">25:00</div>

                <button
                    type="button"
                    aria-pressed={phase === "break"}
                    onClick={() => setPhase(p => (p === "focus" ? "break" : "focus"))}
                    className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white
                        active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2
                        ${phase === "focus"
                            ? "bg-emerald-500/10 hover:bg-emerald-400/20 focus-visible:ring-emerald-400/40"
                            : "bg-sky-500/10 hover:bg-sky-400/20 focus-visible:ring-sky-400/40"}`}
                >
                    <span className={`h-2 w-2 rounded-full ${phase === "focus" ? "bg-emerald-400" : "bg-sky-400"}`} />
                    {phase === "focus" ? "Focus" : "Break"}
                </button>
            </div>
        </div>
    );
}