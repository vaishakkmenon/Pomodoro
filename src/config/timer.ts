export type Tab = 'study' | 'short' | 'long';
export const TABS: Tab[] = ['study', 'short', 'long'];
export const LABELS: Record<Tab,string> = {
    study: 'Study Time', short: 'Short Break', long: 'Long Break',
};
export const DURATIONS: Record<Tab, number> = {
    study: 25*60, short: 5*60, long: 15*60,
};
export const LONG_EVERY = 4;