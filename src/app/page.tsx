"use client";


import Timer from "@/components/timer/Timer";
import { SpotifyErrorHandler } from "@/components/spotify/SpotifyErrorHandler";
import { LoginButton } from "@/components/auth/LoginButton";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default function Home() {
    return (
        <main className="min-h-screen relative grid place-items-center text-white">
            {/* Header / Top Right Auth */}
            <div className="absolute top-4 right-4 z-50">
                <LoginButton />
            </div>

            <Timer />
            <SpotifyErrorHandler />
            <AdminPanel />
        </main>
    );
}
