import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAudio } from "@/hooks/useAudio";

// Mock HTMLAudioElement with partial implementation
function createMockAudio(src?: string) {
    return {
        src: src ?? "",
        preload: "",
        volume: 1,
        currentTime: 0,
        muted: false,
        paused: true,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        load: vi.fn(),
    };
}

describe("useAudio", () => {
    let mockAudioInstance: ReturnType<typeof createMockAudio>;

    beforeEach(() => {
        mockAudioInstance = createMockAudio();
        vi.stubGlobal("Audio", vi.fn().mockImplementation((src: string) => {
            mockAudioInstance = createMockAudio(src);
            return mockAudioInstance;
        }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("creates an audio element on mount", () => {
        renderHook(() => useAudio("/test.mp3"));

        expect(globalThis.Audio).toHaveBeenCalledWith("/test.mp3");
    });

    it("sets volume from options", () => {
        renderHook(() => useAudio("/test.mp3", { volume: 0.5 }));

        expect(mockAudioInstance.volume).toBe(0.5);
    });

    it("play resets currentTime and plays", async () => {
        const { result } = renderHook(() => useAudio("/test.mp3"));

        await act(async () => {
            await result.current.play();
        });

        expect(mockAudioInstance.currentTime).toBe(0);
        expect(mockAudioInstance.play).toHaveBeenCalled();
    });

    it("prime mutes, plays, pauses, then unmutes", async () => {
        const { result } = renderHook(() => useAudio("/test.mp3"));

        await act(async () => {
            await result.current.prime();
        });

        expect(mockAudioInstance.play).toHaveBeenCalled();
        expect(mockAudioInstance.pause).toHaveBeenCalled();
        expect(mockAudioInstance.muted).toBe(false);
        expect(mockAudioInstance.currentTime).toBe(0);
    });

    it("prime only runs once", async () => {
        const { result } = renderHook(() => useAudio("/test.mp3"));

        await act(async () => {
            await result.current.prime();
        });

        expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);

        await act(async () => {
            await result.current.prime();
        });

        // Should not have been called again
        expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    });

    it("cleans up audio element on unmount", () => {
        const { unmount } = renderHook(() => useAudio("/test.mp3"));

        unmount();

        expect(mockAudioInstance.pause).toHaveBeenCalled();
        expect(mockAudioInstance.src).toBe("");
    });

    it("handles play errors gracefully", async () => {
        mockAudioInstance.play = vi.fn().mockRejectedValue(new Error("Autoplay blocked"));

        const { result } = renderHook(() => useAudio("/test.mp3"));

        // Should not throw
        await act(async () => {
            await result.current.play();
        });

        expect(mockAudioInstance.play).toHaveBeenCalled();
    });

    it("recreates audio element when src changes", () => {
        const { rerender } = renderHook(
            ({ src }) => useAudio(src),
            { initialProps: { src: "/sound1.mp3" } }
        );

        expect(globalThis.Audio).toHaveBeenCalledWith("/sound1.mp3");

        rerender({ src: "/sound2.mp3" });

        expect(globalThis.Audio).toHaveBeenCalledWith("/sound2.mp3");
    });
});
