"use client";

import { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePremium } from "@/hooks/usePremium";

export function CustomUserMenu() {
    const { user, isLoaded } = useUser();
    const { signOut, openSignIn } = useClerk();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { isPremium } = usePremium();

    const isOwner = user?.primaryEmailAddress?.emailAddress === process.env.NEXT_PUBLIC_OWNER_EMAIL;

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isLoaded) return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;

    if (!user) {
        return (
            <button
                onClick={() => openSignIn()}
                className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-full transition-colors text-sm"
            >
                Sign In
            </button>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
            >
                {user.imageUrl ? (
                    <Image
                        src={user.imageUrl}
                        alt={user.fullName || "User"}
                        width={32}
                        height={32}
                        className="rounded-full border border-white/10"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {user.firstName?.charAt(0) || "U"}
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-3 border-b border-white/5 mb-2">
                        <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
                        <p className="text-xs text-white/50 truncate mb-2">{user.primaryEmailAddress?.emailAddress}</p>
                        <div className="flex gap-2">
                            {isOwner && (
                                <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full font-medium border border-purple-500/20">
                                    Owner
                                </span>
                            )}
                            {isPremium && (
                                <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-medium border border-amber-500/20">
                                    Premium
                                </span>
                            )}
                        </div>
                    </div>

                    {isOwner && (
                        <Link
                            href="/admin"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Shield size={16} />
                            Admin Panel
                        </Link>
                    )}

                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}
