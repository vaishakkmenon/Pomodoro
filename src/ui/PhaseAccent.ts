import type { Accent, Phase } from "./types";

const phaseBaseBg = (phase: Phase) =>
  phase === "focus" ? "bg-emerald-500/10" : "bg-sky-500/10";

const dangerStates =
  "hover:bg-red-500/20 active:bg-red-500/25 focus-visible:ring-red-500/40";

export const phaseAccent = (accent: Accent) => {
  if (accent === "danger") {
    return "bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/25 focus-visible:ring-red-500/40";
  }
  return accent === "focus"
    ? "bg-emerald-500/10 hover:bg-emerald-400/20 focus-visible:ring-emerald-400/40"
    : "bg-sky-500/10 hover:bg-sky-400/20 focus-visible:ring-sky-400/40";
};

export const phaseDanger = (phase: Phase) => `${phaseBaseBg(phase)} ${dangerStates}`;