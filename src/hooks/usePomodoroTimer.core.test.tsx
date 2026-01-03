import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import type { Durations } from "@/config/timer";

const tiny: Durations = { study: 2, short: 1, long: 1 };

describe("usePomodoroTimer core", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("ticks and rolls from study -> short", () => {
        const onComplete = vi.fn();
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations: tiny, longEvery: 99, onComplete })
        );

        act(() => result.current.start());
        act(() => vi.advanceTimersByTime(2000)); // study: 2s

        expect(onComplete).toHaveBeenCalledWith("study");
        expect(result.current.tab).toBe("short");
        expect(result.current.secondsLeft).toBe(tiny.short);
        expect(result.current.isRunning).toBe(true);
    });

    it("long break every N studies", () => {
        const tinyLocal: Durations = { study: 2, short: 1, long: 1 };
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations: tinyLocal, longEvery: 2 })
        );

        // Let the effect that installs setInterval run *before* advancing timers
        act(() => result.current.start());
        act(() => vi.advanceTimersByTime(2000)); // study(2s) -> short
        expect(result.current.tab).toBe("short");

        act(() => vi.advanceTimersByTime(1000)); // short(1s) -> study
        expect(result.current.tab).toBe("study");

        act(() => vi.advanceTimersByTime(2000)); // study(2s) -> long (because longEvery=2)
        expect(result.current.tab).toBe("long");
    });

    it("switchTab stops immediately and resets seconds", () => {
        const durations: Durations = { study: 60, short: 30, long: 15 };
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations })
        );

        act(() => { result.current.start(); vi.advanceTimersByTime(1000); }); // 59 left
        act(() => result.current.switchTab("short"));

        expect(result.current.isRunning).toBe(false);
        expect(result.current.tab).toBe("short");
        expect(result.current.secondsLeft).toBe(30);

        act(() => vi.advanceTimersByTime(1100)); // still paused
        expect(result.current.secondsLeft).toBe(30);
    });

    it("reset stops and restores full duration", () => {
        const durations: Durations = { study: 60, short: 30, long: 15 };
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations })
        );

        act(() => { result.current.start(); vi.advanceTimersByTime(2000); }); // 58 left
        act(() => result.current.reset());

        expect(result.current.isRunning).toBe(false);
        expect(result.current.secondsLeft).toBe(60);
    });
});