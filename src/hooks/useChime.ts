import { useAudio } from "./useAudio";

export function useChime(path = "/sounds/windchimes.mp3", volume = 0.28) {
    return useAudio(path, { volume });
}