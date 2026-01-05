"use client";

import { useState, useEffect, useRef } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";

interface LoginModalProps {
    onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
    const { login, error, clearError } = useSiteAuth();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || isSubmitting) return;

        setIsSubmitting(true);
        clearError();

        const { error } = await login(email);

        setIsSubmitting(false);

        if (!error) {
            setEmailSent(true);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-sm mx-4 p-6 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl">
                {emailSent ? (
                    // Success state
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                        <p className="text-white/60 text-sm mb-4">
                            We sent a magic link to <span className="text-white">{email}</span>
                        </p>
                        <p className="text-white/40 text-xs mb-6">
                            Click the link in the email to sign in. You can close this modal.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-sm text-white/70 hover:text-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    // Login form
                    <>
                        <h2 className="text-xl font-semibold text-white mb-2">Log in</h2>
                        <p className="text-white/60 text-sm mb-6">
                            Enter your email to receive a magic link.
                        </p>

                        <form onSubmit={handleSubmit}>
                            <input
                                ref={inputRef}
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                            />

                            {error && (
                                <p className="mt-2 text-sm text-red-400">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !email.trim()}
                                className="w-full mt-4 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        Sending...
                                    </span>
                                ) : (
                                    "Send magic link"
                                )}
                            </button>
                        </form>

                        <button
                            onClick={onClose}
                            className="w-full mt-3 py-2 text-sm text-white/50 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
