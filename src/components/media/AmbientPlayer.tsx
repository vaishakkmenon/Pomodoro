import { useState, useEffect, useRef } from "react";
import { cx } from "@/ui/cx";
import { CloudRain, Trees, Coffee, Flame, Volume2, VolumeX } from "lucide-react";

interface Sound {
    id: string;
    label: string;
    icon: React.ElementType;
    src: string;
}

const SOUNDS: Sound[] = [
    { id: "rain", label: "Rain", icon: CloudRain, src: "/sounds/rain.mp3" },
    { id: "forest", label: "Forest", icon: Trees, src: "/sounds/forest.mp3" },
    { id: "cafe", label: "Cafe", icon: Coffee, src: "/sounds/cafe.mp3" },
    { id: "fireplace", label: "Fireplace", icon: Flame, src: "/sounds/fireplace.mp3" },
];

export function AmbientPlayer() {
    // State to track volume and playing status for each sound
    const [states, setStates] = useState<Record<string, { playing: boolean; volume: number }>>(() =>
        SOUNDS.reduce((acc, s) => ({ ...acc, [s.id]: { playing: false, volume: 0.5 } }), {})
    );

    // Audio refs
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

    // Sync state with audio elements
    useEffect(() => {
        SOUNDS.forEach((sound) => {
            const state = states[sound.id];
            let audio = audioRefs.current[sound.id];

            if (!audio) {
                audio = new Audio(sound.src);
                audio.loop = true;
                audioRefs.current[sound.id] = audio;
            }

            if (state?.playing) {
                if (audio.paused) {
                    audio.play().catch(e => console.warn("Audio play failed:", e));
                }
                audio.volume = state.volume;
            } else {
                if (!audio.paused) {
                    audio.pause();
                }
            }
        });
    }, [states]);

    // Cleanup on unmount
    // Cleanup on unmount
    useEffect(() => {
        const refs = audioRefs.current;
        return () => {
            Object.values(refs).forEach(audio => {
                audio.pause();
                audio.src = "";
            });
        };
    }, []);

    const toggleSound = (id: string) => {
        setStates(prev => ({
            ...prev,
            [id]: { ...prev[id], playing: !prev[id].playing }
        }));
    };

    const updateVolume = (id: string, vol: number) => {
        setStates(prev => ({
            ...prev,
            [id]: { ...prev[id], volume: vol }
        }));
    };

    return (
        <div className="h-full w-full p-6 flex flex-col overflow-y-auto custom-scrollbar">
            <h3 className="text-white font-medium mb-6 text-lg">Ambient Sounds</h3>

            <div className="grid gap-4">
                {SOUNDS.map((sound) => {
                    const state = states[sound.id];
                    const isActive = state.playing;

                    return (
                        <div
                            key={sound.id}
                            className={cx(
                                "p-4 rounded-xl border transition-all duration-300",
                                isActive
                                    ? "bg-white/10 border-white/20"
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => toggleSound(sound.id)}
                                    className={cx(
                                        "p-3 rounded-full transition-colors",
                                        isActive
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-white/5 text-white/40 hover:text-white"
                                    )}
                                >
                                    <sound.icon className="w-5 h-5" />
                                </button>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={cx(
                                            "font-medium",
                                            isActive ? "text-white" : "text-white/60"
                                        )}>
                                            {sound.label}
                                        </span>
                                        {isActive && (
                                            <span className="text-xs text-white/40 font-mono">
                                                {Math.round(state.volume * 100)}%
                                            </span>
                                        )}
                                    </div>

                                    {/* Volume Slider */}
                                    <div className="flex items-center gap-3">
                                        <VolumeX className="w-3 h-3 text-white/20" />
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={state.volume}
                                            onChange={(e) => {
                                                const newVol = parseFloat(e.target.value);
                                                updateVolume(sound.id, newVol);
                                                // If dragging volume from 0, auto-enable if disabled? 
                                                // Optional UX: if !playing, set playing true on volume change
                                                if (!state.playing && newVol > 0) {
                                                    toggleSound(sound.id);
                                                }
                                            }}
                                            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/50 hover:[&::-webkit-slider-thumb]:bg-white transition-all"
                                        />
                                        <Volume2 className="w-3 h-3 text-white/20" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
