import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { PERSIST_KEY } from "@/hooks/usePersistence";
import { DURATIONS } from "@/config/timer";

describe("usePomodoroTimer hydration", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("hydrates a running study session and continues ticking", () => {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ tab: "study", seconds: 1493, running: true }));

        const { result } = renderHook(() => usePomodoroTimer());

        // first render uses saved values (no 25:00 flash)
        expect(result.current.tab).toBe("study");
        expect(result.current.secondsLeft).toBe(1493);
        expect(result.current.isRunning).toBe(true);

        act(() => vi.advanceTimersByTime(2000));
        expect(result.current.secondsLeft).toBe(1491);
    });

    it("hydrates a paused short break", () => {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ tab: "short", seconds: 60, running: false }));

        const { result } = renderHook(() => usePomodoroTimer());

        expect(result.current.tab).toBe("short");
        expect(result.current.isRunning).toBe(false);
        expect(result.current.secondsLeft).toBe(60);
    });

    it("ignores corrupt storage and falls back to defaults", () => {
        localStorage.setItem(PERSIST_KEY, "not-json");

        const { result } = renderHook(() => usePomodoroTimer());

        expect(result.current.tab).toBe("study");
        expect(result.current.isRunning).toBe(false);
        expect(result.current.secondsLeft).toBe(DURATIONS.study);
    });

    it("ignores invalid tab in storage", () => {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ tab: "weird", seconds: 123, running: true }));

        const { result } = renderHook(() => usePomodoroTimer());

        expect(result.current.tab).toBe("study");
        expect(result.current.secondsLeft).toBe(DURATIONS.study);
        expect(result.current.isRunning).toBe(false);
    });
});