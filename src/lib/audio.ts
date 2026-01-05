export class AudioPlayer {
    private audio: HTMLAudioElement | null = null;

    constructor(src: string) {
        if (typeof window !== "undefined") {
            this.audio = new Audio(src);
        }
    }

    play(volume = 1) {
        if (!this.audio) return;
        this.audio.volume = Math.max(0, Math.min(1, volume));
        this.audio.currentTime = 0;
        this.audio.play().catch((e) => {
            // Auto-play policy might block this
            console.warn("Audio play failed:", e);
        });
    }
}

export const chimePlayer = new AudioPlayer("/sounds/chime_1.mp3");
