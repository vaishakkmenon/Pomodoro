import ReactPlayer from "react-player";
import { Maximize2, Minimize2, Repeat, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cx } from "@/ui/cx";

interface YouTubePlayerProps {
    isWide: boolean;
    toggleTheaterMode: () => void;
}

export function YouTubePlayer({ isWide, toggleTheaterMode }: YouTubePlayerProps) {
    const [url, setUrl] = useState("https://www.youtube.com/watch?v=jfKfPfyJRdk"); // Lofi Girl default
    const [isMinimised, setIsMinimised] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(true);
    const [inputValue, setInputValue] = useState(url);

    const handleUpdateUrl = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.includes("youtube.com") || inputValue.includes("youtu.be")) {
            setUrl(inputValue);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md">
            {/* Controls Bar */}
            <div className="flex items-center gap-2 p-3 border-b border-white/10">
                <form onSubmit={handleUpdateUrl} className="flex-1">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Paste YouTube URL..."
                        aria-label="YouTube URL"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
                    />
                </form>

                <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={cx("p-1.5 rounded-lg transition-colors", isLooping ? "text-emerald-400 bg-emerald-400/10" : "text-white/40 hover:text-white")}
                    title="Toggle Loop"
                >
                    <Repeat className="w-4 h-4" />
                </button>

                <button
                    onClick={() => setIsMinimised(!isMinimised)}
                    className={cx("p-1.5 rounded-lg transition-colors", isMinimised ? "text-amber-400 bg-amber-400/10" : "text-white/40 hover:text-white")}
                    title={isMinimised ? "Show Video" : "Stealth Mode"}
                >
                    {isMinimised ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                <button
                    onClick={toggleTheaterMode}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors"
                    title={isWide ? "Exit Theater Mode" : "Theater Mode"}
                >
                    {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            {/* Player Container */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
                <div
                    className={cx(
                        "transition-all duration-500",
                        isMinimised ? "w-px h-px opacity-0 overflow-hidden" : "w-full h-full"
                    )}
                >
                    {/*  */}
                    <ReactPlayer
                        src={url}
                        width="100%"
                        height="100%"
                        loop={isLooping}
                        playing={isPlaying}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        controls={true}
                        config={{
                            youtube: {
                                playerVars: { modestbranding: 1 }
                            } as any // eslint-disable-line @typescript-eslint/no-explicit-any
                        }}
                    />
                </div>

                {isMinimised && (
                    <div className="flex flex-col items-center justify-center text-white/30 gap-2">
                        <EyeOff className="w-8 h-8" />
                        <span className="text-sm">Audio Playing in Stealth Mode</span>
                    </div>
                )}
            </div>
        </div>
    );
}
