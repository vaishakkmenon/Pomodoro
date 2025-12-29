import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistence, useStoredState, PERSIST_KEY } from "@/hooks/usePersistence";
import type { Tab } from "@/config/timer";

// Mock timer API for usePersistence tests
function createMockApi(overrides: Partial<{
    tab: Tab;
    secondsLeft: number;
    isRunning: boolean;
    completedStudies: number;
}> = {}) {
    return {
        tab: overrides.tab ?? "study" as Tab,
        secondsLeft: overrides.secondsLeft ?? 1500,
        isRunning: overrides.isRunning ?? false,
        completedStudies: overrides.completedStudies ?? 0,
        switchTab: vi.fn(),
        setSeconds: vi.fn(),
        start: vi.fn(),
        pause: vi.fn(),
    };
}

describe("usePersistence", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns hydrated: true after initial mount", () => {
        const api = createMockApi();
        const { result } = renderHook(() => usePersistence(api));

        expect(result.current.hydrated).toBe(true);
    });

    it("saves state to localStorage on state changes", () => {
        const api = createMockApi({ tab: "study", secondsLeft: 1234, isRunning: true });
        renderHook(() => usePersistence(api, PERSIST_KEY));

        const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || "{}");
        expect(saved.tab).toBe("study");
        expect(saved.seconds).toBe(1234);
        expect(saved.running).toBe(true);
        expect(saved.savedAt).toBeDefined();
    });

    it("updates localStorage when api values change", () => {
        let api = createMockApi({ secondsLeft: 100 });
        const { rerender } = renderHook(() => usePersistence(api, PERSIST_KEY));

        // Initial save
        let saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || "{}");
        expect(saved.seconds).toBe(100);

        // Update api and rerender
        api = createMockApi({ secondsLeft: 50 });
        rerender();

        saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || "{}");
        expect(saved.seconds).toBe(50);
    });

    it("applies clampSeconds if provided", () => {
        const api = createMockApi({ secondsLeft: 9999 });
        const clampSeconds = vi.fn((tab: Tab, secs: number) => Math.min(secs, 1500));

        renderHook(() => usePersistence(api, PERSIST_KEY, { clampSeconds }));

        const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || "{}");
        expect(saved.seconds).toBe(1500);
        expect(clampSeconds).toHaveBeenCalled();
    });

    it("throttles saves when saveThrottleMs is provided", () => {
        const api = createMockApi();
        renderHook(() => usePersistence(api, PERSIST_KEY, { saveThrottleMs: 500 }));

        // Initially no save (throttled)
        expect(localStorage.getItem(PERSIST_KEY)).toBeNull();

        // After throttle period, save occurs
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(localStorage.getItem(PERSIST_KEY)).not.toBeNull();
    });
});

describe("useStoredState", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("initializes with default value when localStorage is empty", () => {
        const { result } = renderHook(() => useStoredState("test-key", 42));
        expect(result.current[0]).toBe(42);
    });

    it("initializes with stored value when present", () => {
        localStorage.setItem("test-key", JSON.stringify(100));
        const { result } = renderHook(() => useStoredState("test-key", 42));
        expect(result.current[0]).toBe(100);
    });

    it("persists value changes to localStorage", () => {
        const { result } = renderHook(() => useStoredState("test-key", "initial"));

        act(() => {
            result.current[1]("updated");
        });

        expect(result.current[0]).toBe("updated");
        expect(JSON.parse(localStorage.getItem("test-key") || "")).toBe("updated");
    });

    it("handles complex objects", () => {
        const initial = { name: "test", count: 0 };
        const { result } = renderHook(() => useStoredState("test-key", initial));

        act(() => {
            result.current[1]({ name: "updated", count: 5 });
        });

        const stored = JSON.parse(localStorage.getItem("test-key") || "{}");
        expect(stored).toEqual({ name: "updated", count: 5 });
    });

    it("falls back to initial value on corrupt JSON", () => {
        localStorage.setItem("test-key", "not-valid-json");
        const { result } = renderHook(() => useStoredState("test-key", "fallback"));
        expect(result.current[0]).toBe("fallback");
    });

    it("handles arrays", () => {
        const { result } = renderHook(() => useStoredState<string[]>("test-key", []));

        act(() => {
            result.current[1](["a", "b", "c"]);
        });

        expect(result.current[0]).toEqual(["a", "b", "c"]);
        expect(JSON.parse(localStorage.getItem("test-key") || "[]")).toEqual(["a", "b", "c"]);
    });
});
