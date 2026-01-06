

import { useState } from "react";

export function SpotifyEmbed() {
    const [inputValue, setInputValue] = useState("");
    const [embedUrl, setEmbedUrl] = useState("https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM?utm_source=generator&theme=0"); // Lofi Girl logic

    // Convert standard URL to Embed URL
    // e.g. https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM -> https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM
    const updateEmbed = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = new URL(inputValue);
            if (url.hostname === "open.spotify.com") {
                const parts = url.pathname.split("/");
                const type = parts[1];
                const id = parts[2];
                if ((type === "playlist" || type === "album" || type === "track") && id) {
                    setEmbedUrl(`https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`);
                    setInputValue("");
                }
            }
        } catch {
            // Invalid URL, ignore
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md">
            <div className="p-3 border-b border-white/10">
                <form onSubmit={updateEmbed}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Paste Spotify Playlist/Album URL..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-white/20"
                    />
                </form>
            </div>
            <div className="flex-1 bg-black">
                <iframe
                    style={{ borderRadius: "12px" }}
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                />
            </div>
        </div>
    );
}
