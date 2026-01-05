"use client";

import { useState, useRef, useEffect } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";
import { LoginModal } from "./LoginModal";
import { User, LogOut, ShieldCheck, Music } from "lucide-react";
import { AdminPanel } from "@/components/admin/AdminPanel"; // We will modify this component slightly or control its visibility here

export function UserMenu() {
    const { user, isPremium, isLoading, logout } = useSiteAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    // Logic to determine if user is owner (simplified client-side check for UI visibility)
    // Real security is on the backend.
    const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL;
    const isOwner = user?.email && ownerEmail && user.email.toLowerCase() === ownerEmail.toLowerCase();

    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isLoading) {
        return <div className="animate-pulse w-8 h-8 rounded-full bg-white/10" />;
    }

    if (!user) {
        return (
            <>
                <button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/5 rounded-full backdrop-blur-sm transition-all shadow-lg hover:shadow-white/5"
                >
                    <User size={16} />
                    Sign In
                </button>
                {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
            </>
        );
    }



    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-10 h-10 flex items-center justify-center rounded-full
                    bg-gradient-to-br from-white/10 to-white/5 
                    border border-white/10 hover:border-white/30
                    text-white/90 font-semibold text-sm
                    shadow-lg backdrop-blur-md transition-all
                    ${isOpen ? 'ring-2 ring-white/20' : ''}
                `}
            >
                <div className="text-white/80">
                    <User size={20} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-12 right-0 w-64 p-2 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 origin-top-right z-50">

                    {/* Header */}
                    <div className="px-3 py-3 border-b border-white/5 mb-1">
                        <p className="text-white text-sm font-medium truncate">{user.email}</p>
                        {isPremium && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
                                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500/90">Premium</span>
                            </div>
                        )}
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-0.5">

                        {/* Admin Tools (Only for Owner) */}
                        {isOwner && (
                            <button
                                onClick={() => {
                                    setShowAdminPanel(true);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                            >
                                <ShieldCheck size={16} className="text-blue-400 group-hover:text-blue-300" />
                                Admin Tools
                            </button>
                        )}

                        {/* Spotify / Settings Placeholder */}
                        {isPremium && (
                            <button
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Music size={16} className="text-green-400" />
                                Spotify Settings
                            </button>
                        )}

                        <div className="h-px bg-white/5 my-1" />

                        <button
                            onClick={() => {
                                logout();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Admin Panel Modal Overlay */}
            {showAdminPanel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdminPanel(false)}>
                    <div onClick={e => e.stopPropagation()}>
                        {/* We will refactor AdminPanel to render nicely here or just pass a prop */}
                        <AdminPanel isModal={true} onClose={() => setShowAdminPanel(false)} user={user} />
                    </div>
                </div>
            )}
        </div>
    );
}
