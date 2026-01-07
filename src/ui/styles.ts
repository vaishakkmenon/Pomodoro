import { cx, type ClassArg } from "./cx";
import type { Accent, Phase } from "./types";

export const pillBase =
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-base leading-none " +
    "active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2";

export const phaseAccent = (accent: Accent) => {
    if (accent === "danger") {
        return "bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/25 focus-visible:ring-red-500/40 text-red-500";
    }
    return accent === "focus"
        ? "bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 focus-visible:ring-[var(--accent-primary)]/40 text-[var(--accent-primary)]"
        : "bg-[var(--accent-break)]/20 hover:bg-[var(--accent-break)]/30 focus-visible:ring-[var(--accent-break)]/40 text-[var(--accent-break)]";
};

export const pill = (accent: Accent, ...extras: ClassArg[]) =>
    cx(pillBase, phaseAccent(accent), ...extras);

export const phaseDot = (phase: Phase) =>
    phase === "focus" ? "bg-emerald-400" : "bg-sky-400";
