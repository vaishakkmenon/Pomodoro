"use client";

import { useEffect, useState } from "react";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import type { Playlist, SpotifyPreferences } from "@/types/spotify";

export function MusicSettings() {
    const { isAuthenticated, isLoading: authLoading, login } = useSpotifyAuth();
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [preferences, setPreferences] = useState<SpotifyPreferences>({
        focus_playlist_uri: null,
        break_playlist_uri: null,
        auto_play_enabled: false,
        volume_focus: 50,
        volume_break: 70,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

    // Fetch playlists and preferences
    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        Promise.all([
            fetch("/api/spotify/playlists", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/spotify/settings", { credentials: "include" }).then((r) => r.json()),
        ])
            .then(([playlistData, prefsData]) => {
                setPlaylists(playlistData.playlists || []);
                if (prefsData && !prefsData.error) {
                    setPreferences(prefsData);
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isAuthenticated]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus("idle");

        try {
            const response = await fetch("/api/spotify/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preferences),
                credentials: "include",
            });

            if (!response.ok) throw new Error("Save failed");

            setSaveStatus("success");
            setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (error) {
            console.error(error);
            setSaveStatus("error");
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="p-6 text-center space-y-4">
                <p className="text-muted-foreground">
                    Connect Spotify to enable Auto-DJ
                </p>
                <button
                    onClick={login}
                    className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full font-medium transition-colors cursor-pointer"
                >
                    Connect Spotify
                </button>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-4 text-center">Loading settings...</div>;
    }

    return (
        <div className="space-y-6 p-4">
            <h2 className="text-xl font-semibold">Music Settings</h2>

            {/* Auto-DJ Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={preferences.auto_play_enabled}
                    onChange={(e) =>
                        setPreferences((p) => ({ ...p, auto_play_enabled: e.target.checked }))
                    }
                    className="w-5 h-5 rounded cursor-pointer"
                />
                <span>Enable Auto-DJ</span>
            </label>

            {preferences.auto_play_enabled && (
                <>
                    {/* Focus Playlist */}
                    <div className="space-y-2">
                        <label className="block font-medium">Focus Playlist</label>
                        <select
                            value={preferences.focus_playlist_uri || ""}
                            onChange={(e) =>
                                setPreferences((p) => ({
                                    ...p,
                                    focus_playlist_uri: e.target.value || null,
                                }))
                            }
                            className="w-full p-2 border rounded bg-background"
                        >
                            <option value="">Select a playlist</option>
                            {playlists.map((p) => (
                                <option key={p.uri} value={p.uri}>
                                    {p.name} ({p.trackCount} tracks)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Break Playlist */}
                    <div className="space-y-2">
                        <label className="block font-medium">Break Playlist</label>
                        <select
                            value={preferences.break_playlist_uri || ""}
                            onChange={(e) =>
                                setPreferences((p) => ({
                                    ...p,
                                    break_playlist_uri: e.target.value || null,
                                }))
                            }
                            className="w-full p-2 border rounded bg-background"
                        >
                            <option value="">None (pause during break)</option>
                            {playlists.map((p) => (
                                <option key={p.uri} value={p.uri}>
                                    {p.name} ({p.trackCount} tracks)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Volume Sliders */}
                    <div className="space-y-2">
                        <label className="block font-medium">
                            Focus Volume: {preferences.volume_focus}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={preferences.volume_focus}
                            onChange={(e) =>
                                setPreferences((p) => ({
                                    ...p,
                                    volume_focus: Number(e.target.value),
                                }))
                            }
                            className="w-full accent-[#1DB954]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block font-medium">
                            Break Volume: {preferences.volume_break}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={preferences.volume_break}
                            onChange={(e) =>
                                setPreferences((p) => ({
                                    ...p,
                                    volume_break: Number(e.target.value),
                                }))
                            }
                            className="w-full accent-[#1DB954]"
                        />
                    </div>
                </>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full py-2 rounded font-medium transition-colors ${saveStatus === "success"
                        ? "bg-green-500 text-white"
                        : saveStatus === "error"
                            ? "bg-red-500 text-white"
                            : "bg-[#1DB954] hover:bg-[#1ed760] text-white"
                    } disabled:opacity-50 cursor-pointer`}
            >
                {isSaving
                    ? "Saving..."
                    : saveStatus === "success"
                        ? "Saved!"
                        : saveStatus === "error"
                            ? "Error - Try Again"
                            : "Save Settings"}
            </button>
        </div>
    );
}
