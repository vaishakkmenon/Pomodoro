"use client";

import { useState, useEffect, useCallback } from "react";
import type { SpotifySession } from "@/types/spotify";

export function useSpotifyAuth() {
    const [session, setSession] = useState<SpotifySession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check session on mount
    useEffect(() => {
        fetch("/api/spotify/session", { credentials: "include" })
            .then((r) => r.json())
            .then((data) => setSession(data))
            .catch(() => setSession({ authenticated: false, user: null }))
            .finally(() => setIsLoading(false));
    }, []);

    const login = useCallback(() => {
        // Redirect to OAuth flow
        window.location.href = "/api/spotify/login";
    }, []);

    const logout = useCallback(() => {
        window.location.href = "/api/spotify/logout";
    }, []);

    return {
        session,
        isLoading,
        isAuthenticated: session?.authenticated ?? false,
        user: session?.user ?? null,
        login,
        logout,
    };
}
