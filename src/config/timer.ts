export type Tab = 'study' | 'short' | 'long';
export const TABS: Tab[] = ['study', 'short', 'long'];
export const LABELS: Record<Tab, string> = {
    study: 'Study Time', short: 'Short Break', long: 'Long Break',
};

/** Type alias for timer durations - use this for test fixtures */
export type Durations = Record<Tab, number>;

export const DURATIONS: Durations = {
    study: 25 * 60, short: 5 * 60, long: 15 * 60,
};
export const LONG_EVERY = 4;

// Catch-up prompt thresholds (in seconds)
export const CATCHUP_MIN_SECONDS = 10;      // Show prompt if away >= 10s
export const CATCHUP_MAX_SECONDS = 10 * 60; // Hide prompt if away > 10 min

// Maximum allowed timer value (24 hours in seconds)
export const MAX_TIMER_SECONDS = 24 * 60 * 60;