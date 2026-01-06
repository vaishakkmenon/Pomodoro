import { ENABLE_ADVANCED_SPOTIFY } from "@/config/features";
import { SpotifyEmbed } from "./SpotifyEmbed";
import { MusicSettings } from "@/components/spotify/MusicSettings";
import { SpotifyConnect } from "@/components/spotify/SpotifyConnect";

export function SpotifyPanel() {
    if (ENABLE_ADVANCED_SPOTIFY) {
        return (
            <div className="flex flex-col gap-4 p-4">
                <SpotifyConnect />
                <MusicSettings />
            </div>
        );
    }
    return <SpotifyEmbed />;
}
