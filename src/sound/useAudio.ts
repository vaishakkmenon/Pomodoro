import { useEffect, useRef } from "react";

type Options = {
    volume?: number; // 0..1
};

export function useAudio(src: string, { volume = 1 }: Options = {}) {
    const elRef = useRef<HTMLAudioElement | null>(null);
    const primedRef = useRef(false);

    useEffect(() => {
        const el = new Audio(src);
        el.preload = "auto";
        el.volume = volume;
        elRef.current = el;

        return () => {
            if (elRef.current) {
                elRef.current.pause();
                elRef.current.src = "";
                elRef.current = null;
            }
        };
    }, [src, volume]);

    const play = async () => {
        const a = elRef.current;
        if (!a) return;
        try {
            a.currentTime = 0;
            await a.play();
        } catch { }
    };

    const prime = async () => {
        if (primedRef.current) return;
        const a = elRef.current;
        if (!a) return;
        try {
            a.muted = true;
            await a.play();
            a.pause();
            a.currentTime = 0;
            a.muted = false;
            primedRef.current = true;
        } catch { }
    };

    return { play, prime, elementRef: elRef };
}