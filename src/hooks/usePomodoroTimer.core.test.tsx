import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";

const tiny = { study: 2, short: 1, long: 1 } as const;

describe("usePomodoroTimer core", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("ticks and rolls from study -> short", () => {
        const onComplete = vi.fn();
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations: tiny as any, longEvery: 99, onComplete })
        );

        act(() => result.current.start());
        act(() => vi.advanceTimersByTime(2000)); // study: 2s

        expect(onComplete).toHaveBeenCalledWith("study");
        expect(result.current.tab).toBe("short");
        expect(result.current.secondsLeft).toBe(tiny.short);
        expect(result.current.isRunning).toBe(true);
    });

    it("long break every N studies", () => {
        const tiny = { study: 2, short: 1, long: 1 } as const;
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations: tiny as any, longEvery: 2 })
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
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations: { study: 60, short: 30, long: 15 } as any })
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
        const { result } = renderHook(() =>
            usePomodoroTimer({ durations: { study: 60, short: 30, long: 15 } as any })
        );

        act(() => { result.current.start(); vi.advanceTimersByTime(2000); }); // 58 left
        act(() => result.current.reset());

        expect(result.current.isRunning).toBe(false);
        expect(result.current.secondsLeft).toBe(60);
    });
});