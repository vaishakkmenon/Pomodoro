import { useEffect, useRef, useState } from "react";
import { subscribeDuck } from "@/lib/mediaDuck";

/**
 * Returns a gain multiplier (0..1) for background media volume. When the
 * completion chime fires it drops immediately to `low`, holds for the chime's
 * duration, then ramps smoothly back to 1 over `restoreMs`. Media players
 * multiply their own volume by this value to "duck" beneath the chime.
 */
export function useDuck(low = 0.1, restoreMs = 500): number {
    const [gain, setGain] = useState(1);
    const timeoutRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const clearPending = () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        const handle = (durationMs: number) => {
            clearPending();
            setGain(low); // duck down immediately

            // Hold for the chime, then ramp back up to full volume.
            timeoutRef.current = window.setTimeout(() => {
                const start = performance.now();
                const tick = (t: number) => {
                    const p = Math.min(1, (t - start) / restoreMs);
                    setGain(low + (1 - low) * p);
                    rafRef.current = p < 1 ? requestAnimationFrame(tick) : null;
                };
                rafRef.current = requestAnimationFrame(tick);
            }, durationMs);
        };

        const unsubscribe = subscribeDuck(handle);
        return () => {
            unsubscribe();
            clearPending();
        };
    }, [low, restoreMs]);

    return gain;
}
