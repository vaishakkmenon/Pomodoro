"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Error messages for user display
const SPOTIFY_ERROR_MESSAGES: Record<string, string> = {
    not_logged_in: "Please log in first before connecting Spotify.",
    invalid_user: "Your session has expired. Please log in again.",
    not_premium: "Spotify features require special access.",
    spotify_already_linked: "This Spotify account is already connected to a different account.",
    not_linked: "Your Spotify account is not properly linked. Please reconnect.",
    access_denied: "Spotify connection was cancelled.",
    invalid_state: "Session expired. Please try again.",
    server_error: "Something went wrong. Please try again.",
};

export function SpotifyErrorHandler() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const spotifyError = searchParams.get("spotify_error");
        if (spotifyError) {
            setError(SPOTIFY_ERROR_MESSAGES[spotifyError] || "An error occurred.");
            // Clear the URL param
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, [searchParams]);

    if (!error) return null;

    return (
        <div className="fixed bottom-4 right-4 max-w-sm p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="flex items-start gap-3">
                <span>{error}</span>
                <button
                    onClick={() => setError(null)}
                    className="text-red-300 hover:text-white"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
