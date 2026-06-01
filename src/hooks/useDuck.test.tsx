import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDuck } from "./useDuck";
import { duckMedia } from "@/lib/mediaDuck";

describe("useDuck", () => {
    beforeEach(() => {
        // Drive requestAnimationFrame off the fake clock so the restore ramp is
        // deterministic.
        vi.useFakeTimers();
        vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
            setTimeout(() => cb(performance.now()), 16) as unknown as number
        );
        vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("starts at full gain (1)", () => {
        const { result } = renderHook(() => useDuck());
        expect(result.current).toBe(1);
    });

    it("drops to the low gain immediately when media is ducked", () => {
        const { result } = renderHook(() => useDuck(0.1, 500));

        act(() => {
            duckMedia(1000);
        });

        expect(result.current).toBe(0.1);
    });

    it("ramps back to full gain after the duck duration", () => {
        const { result } = renderHook(() => useDuck(0.1, 500));

        act(() => {
            duckMedia(1000);
        });
        expect(result.current).toBe(0.1);

        // Hold period + restore ramp.
        act(() => {
            vi.advanceTimersByTime(1000 + 500 + 32);
        });

        expect(result.current).toBe(1);
    });

    it("holds the duck while the chime is still playing", () => {
        const { result } = renderHook(() => useDuck(0.1, 500));

        act(() => {
            duckMedia(1000);
        });

        // Partway through the hold, still ducked (restore hasn't started).
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe(0.1);
    });
});
