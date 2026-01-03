import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChime } from "@/hooks/useChime";

// Create a stable mock return value
const mockAudioReturn = {
    play: vi.fn(),
    prime: vi.fn(),
    elementRef: { current: null },
};

// Mock useAudio since useChime is just a wrapper
vi.mock("@/hooks/useAudio", () => ({
    useAudio: vi.fn(() => mockAudioReturn),
}));

import { useAudio } from "@/hooks/useAudio";

describe("useChime", () => {
    beforeEach(() => {
        vi.mocked(useAudio).mockClear();
    });

    it("calls useAudio with default path and volume", () => {
        renderHook(() => useChime());

        expect(useAudio).toHaveBeenCalledWith("/sounds/windchimes.mp3", { volume: 0.28 });
    });

    it("calls useAudio with custom path", () => {
        renderHook(() => useChime("/custom/sound.mp3"));

        expect(useAudio).toHaveBeenCalledWith("/custom/sound.mp3", { volume: 0.28 });
    });

    it("calls useAudio with custom volume", () => {
        renderHook(() => useChime("/sounds/windchimes.mp3", 0.5));

        expect(useAudio).toHaveBeenCalledWith("/sounds/windchimes.mp3", { volume: 0.5 });
    });

    it("calls useAudio with both custom path and volume", () => {
        renderHook(() => useChime("/custom/chime.wav", 1.0));

        expect(useAudio).toHaveBeenCalledWith("/custom/chime.wav", { volume: 1.0 });
    });

    it("returns the useAudio interface", () => {
        const { result } = renderHook(() => useChime());

        expect(result.current).toHaveProperty("play");
        expect(result.current).toHaveProperty("prime");
        expect(result.current).toHaveProperty("elementRef");
    });
});
