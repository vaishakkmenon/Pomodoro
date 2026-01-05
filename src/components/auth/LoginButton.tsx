"use client";

import { useState } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";
import { LoginModal } from "./LoginModal";

export function LoginButton() {
    const { user, isPremium, isLoading, logout } = useSiteAuth();
    const [showModal, setShowModal] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-white/50">
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (user) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    {isPremium && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full">
                            Premium
                        </span>
                    )}
                    <span className="text-sm text-white/70 truncate max-w-[150px]">
                        {user.email}
                    </span>
                </div>
                <button
                    onClick={() => {
                        logout();
                    }}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                >
                    Log out
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="text-sm text-white/70 hover:text-white transition-colors"
            >
                Log in
            </button>
            {showModal && <LoginModal onClose={() => setShowModal(false)} />}
        </>
    );
}
