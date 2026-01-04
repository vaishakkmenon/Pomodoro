"use client";

import { useCallback, useRef, useEffect } from "react";
import { useSpotifyAuth } from "./useSpotifyAuth";
import type { TimerState } from "@/types/spotify";

interface UseSpotifySyncOptions {
    /** Debounce delay in ms (default: 500) */
    debounceMs?: number;
    /** Callback when sync fails */
    onError?: (error: string, code?: string) => void;
}

export function useSpotifySync(options: UseSpotifySyncOptions = {}) {
    const { debounceMs = 500, onError } = options;
    const { isAuthenticated } = useSpotifyAuth();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastStateRef = useRef<TimerState | null>(null);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const syncPlayback = useCallback(
        (state: TimerState) => {
            // Skip if not authenticated
            if (!isAuthenticated) {
                return;
            }

            // Debounce: clear any pending sync
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Skip if state hasn't changed
            if (lastStateRef.current === state) {
                return;
            }

            timeoutRef.current = setTimeout(async () => {
                try {
                    lastStateRef.current = state;

                    const response = await fetch("/api/spotify/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ state }),
                        credentials: "include",
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        console.error("[SpotifySync] Error:", data);
                        onError?.(data.error, data.code);
                    }
                } catch (error) {
                    console.error("[SpotifySync] Network error:", error);
                    onError?.("Network error");
                }
            }, debounceMs);
        },
        [isAuthenticated, debounceMs, onError]
    );

    return {
        syncPlayback,
        isAuthenticated,
    };
}
