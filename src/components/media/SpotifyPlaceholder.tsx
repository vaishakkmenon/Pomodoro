import { Music } from "lucide-react";
import { SpotifyConnect } from "@/components/spotify/SpotifyConnect";

export function SpotifyPlaceholder() {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-white/40">
            <div className="p-4 bg-white/5 rounded-full mb-4">
                <Music className="w-8 h-8" />
            </div>
            <h3 className="text-white font-medium mb-1">Spotify Unavailable</h3>
            <p className="text-sm max-w-[200px] mb-4">
                Connect your Spotify account to control playback directly from here.
            </p>
            <SpotifyConnect />
        </div>
    );
}
