"use client";

import { Suspense } from "react";
import Timer from "@/components/timer/Timer";
import { SpotifyErrorHandler } from "@/components/spotify/SpotifyErrorHandler";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
    return (
        <main className="min-h-screen relative grid place-items-center text-white">
            {/* Header / Top Right Auth */}
            <div className="absolute top-4 right-4 z-50">
                <UserMenu />
            </div>

            <Timer />
            <Suspense fallback={null}>
                <SpotifyErrorHandler />
            </Suspense>
        </main>
    );
}
