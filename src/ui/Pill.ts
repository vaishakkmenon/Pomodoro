import { cx, type ClassArg } from "./cx";
import { pillBase } from "./PillBase";
import { phaseAccent } from "./PhaseAccent";
import type { Accent } from "./types";

export const pill = (accent: Accent, ...extras: ClassArg[]) =>
  cx(pillBase, phaseAccent(accent), ...extras);
