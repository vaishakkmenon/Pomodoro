"use client";


import Timer from "@/components/timer/Timer";
import { SpotifyErrorHandler } from "@/components/spotify/SpotifyErrorHandler";
import { UserMenu } from "@/components/auth/UserMenu";
import { AdminPanel } from "@/components/admin/AdminPanel"; // Keep AdminPanel here if you want it independently or remove it. But UserMenu handles it now. actually let's remove it from here.

export default function Home() {
    return (
        <main className="min-h-screen relative grid place-items-center text-white">
            {/* Header / Top Right Auth */}
            <div className="absolute top-4 right-4 z-50">
                <UserMenu />
            </div>

            <Timer />
            <SpotifyErrorHandler />
        </main>
    );
}
