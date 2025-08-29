import type { Phase } from "./types";

export const phaseDot = (phase: Phase) =>
  phase === "focus" ? "bg-emerald-400" : "bg-sky-400";