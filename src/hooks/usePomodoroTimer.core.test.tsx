import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import type { Settings } from "@/types/settings";

// Build a Settings object with tiny (seconds-scale) durations. Durations are in
// MINUTES in the Settings shape, so to get a 2-second study phase we pass 2/60.
function makeSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        durations: { work: 2 / 60, shortBreak: 1 / 60, longBreak: 1 / 60 },
        autoStart: true,
        longBreakInterval: 99,
        sound: { volume: 0.5, enabled: false },
        notifications: { enabled: false },
        media: { enabled: false },
        ...overrides,
    };
}

describe("usePomodoroTimer core", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("ticks and rolls from study -> short (auto-start)", () => {
        const onComplete = vi.fn();
        const { result } = renderHook(() =>
            usePomodoroTimer({ settings: makeSettings(), onComplete })
        );

        act(() => result.current.start());
        act(() => vi.advanceTimersByTime(2000)); // study: 2s

        expect(onComplete).toHaveBeenCalledWith("study");
        expect(result.current.tab).toBe("short");
        expect(result.current.secondsLeft).toBe(1);
        expect(result.current.isRunning).toBe(true);
    });

    it("stops at the next phase when auto-start is off", () => {
        const { result } = renderHook(() =>
            usePomodoroTimer({ settings: makeSettings({ autoStart: false }) })
        );

        act(() => result.current.start());
        act(() => vi.advanceTimersByTime(2000)); // study: 2s

        expect(result.current.tab).toBe("short");
        expect(result.current.isRunning).toBe(false);
        expect(result.current.secondsLeft).toBe(1); // full short-break duration
    });

    it("long break every N studies", () => {
        const { result } = renderHook(() =>
            usePomodoroTimer({ settings: makeSettings({ longBreakInterval: 2 }) })
        );

        act(() => result.current.start());
        act(() => vi.advanceTimersByTime(2000)); // study(2s) -> short
        expect(result.current.tab).toBe("short");

        act(() => vi.advanceTimersByTime(1000)); // short(1s) -> study
        expect(result.current.tab).toBe("study");

        act(() => vi.advanceTimersByTime(2000)); // study(2s) -> long (longEvery=2)
        expect(result.current.tab).toBe("long");
    });

    it("switchTab stops immediately and resets seconds", () => {
        const settings = makeSettings({ durations: { work: 1, shortBreak: 0.5, longBreak: 0.25 } });
        const { result } = renderHook(() => usePomodoroTimer({ settings }));

        act(() => { result.current.start(); vi.advanceTimersByTime(1000); }); // 59 left
        act(() => result.current.switchTab("short"));

        expect(result.current.isRunning).toBe(false);
        expect(result.current.tab).toBe("short");
        expect(result.current.secondsLeft).toBe(30);

        act(() => vi.advanceTimersByTime(1100)); // still paused
        expect(result.current.secondsLeft).toBe(30);
    });

    it("reset stops and restores full duration", () => {
        const settings = makeSettings({ durations: { work: 1, shortBreak: 0.5, longBreak: 0.25 } });
        const { result } = renderHook(() => usePomodoroTimer({ settings }));

        act(() => { result.current.start(); vi.advanceTimersByTime(2000); }); // 58 left
        act(() => result.current.reset());

        expect(result.current.isRunning).toBe(false);
        expect(result.current.secondsLeft).toBe(60);
    });

    it("derives remaining time from the wall clock, not the number of ticks", () => {
        // Simulates a backgrounded tab: real time advances (Date.now via fake
        // timers) but the interval is throttled so its callback fires far fewer
        // times than once per second. The countdown must still be correct.
        const settings = makeSettings({ durations: { work: 1, shortBreak: 0.5, longBreak: 0.25 }, autoStart: false });
        const { result } = renderHook(() => usePomodoroTimer({ settings }));

        act(() => result.current.start()); // 60s study

        // Advance the clock 30s but only let a single timer callback fire,
        // mimicking aggressive background throttling.
        act(() => {
            vi.advanceTimersToNextTimer(); // one throttled tick ~30s into the gap
            vi.setSystemTime(Date.now() + 29000);
            vi.advanceTimersToNextTimer();
        });

        // Even with very few ticks, remaining reflects ~30s of real elapsed time,
        // not "60 minus number-of-ticks".
        expect(result.current.secondsLeft).toBeLessThanOrEqual(31);
        expect(result.current.secondsLeft).toBeGreaterThanOrEqual(29);
    });

    it("completes a phase that elapsed entirely while throttled", () => {
        const onComplete = vi.fn();
        const settings = makeSettings({ durations: { work: 1, shortBreak: 0.5, longBreak: 0.25 }, autoStart: false });
        const { result } = renderHook(() => usePomodoroTimer({ settings, onComplete }));

        act(() => result.current.start()); // 60s study

        // Jump the clock past the whole phase, then let one tick fire.
        act(() => {
            vi.setSystemTime(Date.now() + 90_000);
            vi.advanceTimersByTime(1000);
        });

        expect(onComplete).toHaveBeenCalledWith("study");
        expect(result.current.tab).toBe("short");
        expect(result.current.isRunning).toBe(false);
    });
});
