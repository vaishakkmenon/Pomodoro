import { duckMedia } from "./mediaDuck";

type AudioPlayerOptions = {
    /** When true, ducks other in-browser media for the clip's duration on play. */
    duckOthers?: boolean;
};

export class AudioPlayer {
    private audio: HTMLAudioElement | null = null;
    private duckOthers: boolean;

    constructor(src: string, opts: AudioPlayerOptions = {}) {
        this.duckOthers = opts.duckOthers ?? false;
        if (typeof window !== "undefined") {
            this.audio = new Audio(src);
        }
    }

    play(volume = 1) {
        if (!this.audio) return;
        this.audio.volume = Math.max(0, Math.min(1, volume));
        this.audio.currentTime = 0;

        if (this.duckOthers) {
            // Duck background media for the length of the clip so it cuts
            // through. Fall back to a sane default until metadata has loaded.
            const durationMs =
                Number.isFinite(this.audio.duration) && this.audio.duration > 0
                    ? this.audio.duration * 1000
                    : 2500;
            duckMedia(durationMs);
        }

        this.audio.play().catch((e) => {
            // Auto-play policy might block this
            console.warn("Audio play failed:", e);
        });
    }
}

// The completion chime ducks other in-browser audio so it's always audible.
export const chimePlayer = new AudioPlayer("/sounds/chime_1.mp3", { duckOthers: true });
