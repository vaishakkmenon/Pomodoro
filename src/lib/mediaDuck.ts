// Lightweight pub/sub so the completion chime can momentarily "duck" (lower the
// volume of) in-browser background media — the YouTube player and ambient sounds
// — while it plays, so the chime cuts through. External Spotify playback runs on
// a separate device and is not affected here.
type DuckListener = (durationMs: number) => void;

const listeners = new Set<DuckListener>();

/** Subscribe a media player to duck requests. Returns an unsubscribe function. */
export function subscribeDuck(fn: DuckListener): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

/** Ask all subscribed media players to duck their volume for `durationMs`. */
export function duckMedia(durationMs: number): void {
    listeners.forEach((fn) => fn(durationMs));
}
