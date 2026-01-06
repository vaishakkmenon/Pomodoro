import type { Accent } from "./types";

export const phaseAccent = (accent: Accent) => {
  if (accent === "danger") {
    return "bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/25 focus-visible:ring-red-500/40";
  }
  return accent === "focus"
    ? "bg-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/30 focus-visible:ring-[var(--accent-primary)]/40 text-[var(--accent-primary)]"
    : "bg-[var(--accent-break)]/20 hover:bg-[var(--accent-break)]/30 focus-visible:ring-[var(--accent-break)]/40 text-[var(--accent-break)]";
};