"use client";

import { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePremium } from "@/hooks/usePremium";
import { AgeGate } from "@/components/auth/AgeGate";

interface CustomUserMenuProps {
    isOwner?: boolean;
}

// Once a visitor confirms they meet the minimum age we remember it so returning
// visitors aren't re-prompted. We store only this boolean — never the birthdate.
// Bump the version suffix to invalidate previously-stored flags (e.g. v1 was set
// by the old sign-in gate and would otherwise skip the new sign-up gate).
const AGE_VERIFIED_KEY = "pomodoro:ageVerified:v2";

export function CustomUserMenu({ isOwner = false }: CustomUserMenuProps) {
    const { user, isLoaded } = useUser();
    const { signOut, openSignIn, openSignUp } = useClerk();
    const [isOpen, setIsOpen] = useState(false);
    const [ageGateOpen, setAgeGateOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { isPremium } = usePremium();

    // Sign-in is for existing users, who already cleared the age gate when they
    // created their account — so it opens directly, no gate. We hide the in-modal
    // "Sign up" link so account creation can only happen through the gated path.
    const handleSignIn = () => {
        openSignIn({
            appearance: { elements: { footerAction__signUp: { display: "none" } } },
        });
    };

    // Sign-up creates an account, so it must clear the age gate first — unless the
    // visitor already confirmed their age on this device.
    const handleSignUpClick = () => {
        if (typeof window !== "undefined" && localStorage.getItem(AGE_VERIFIED_KEY) === "true") {
            openSignUp();
            return;
        }
        setAgeGateOpen(true);
    };

    const handleAgeConfirmed = () => {
        try {
            localStorage.setItem(AGE_VERIFIED_KEY, "true");
        } catch {
            /* ignore storage failures */
        }
        setAgeGateOpen(false);
        openSignUp();
    };

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
            <>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSignIn}
                        className="text-white/70 hover:text-white font-medium px-4 py-2 rounded-full transition-colors text-sm"
                    >
                        Sign In
                    </button>
                    <button
                        onClick={handleSignUpClick}
                        className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-full transition-colors text-sm"
                    >
                        Sign Up
                    </button>
                </div>
                <AgeGate
                    open={ageGateOpen}
                    onConfirm={handleAgeConfirmed}
                    onClose={() => setAgeGateOpen(false)}
                />
            </>
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
