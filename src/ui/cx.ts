export type ClassArg = string | false | null | undefined;

export const cx = (...args: ClassArg[]) => args.filter(Boolean).join(" ");
