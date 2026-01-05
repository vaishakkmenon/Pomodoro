"use client";

import { useState, useEffect, useRef } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";
import { Mail, Lock, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface LoginModalProps {
    onClose: () => void;
}

type AuthMethod = "password" | "magic_link";
type AuthMode = "signin" | "signup" | "reset";

export function LoginModal({ onClose }: LoginModalProps) {
    const { login, loginWithPassword, signupWithPassword, resetPassword, error, clearError } = useSiteAuth();

    const [method, setMethod] = useState<AuthMethod>("password");
    const [mode, setMode] = useState<AuthMode>("signin");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount or method change
    useEffect(() => {
        inputRef.current?.focus();
        clearError();
    }, [method, mode, clearError]);

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

        let result;

        if (method === "magic_link") {
            result = await login(email);
            if (!result.error) setEmailSent(true);
        } else {
            // Password flow
            if (mode === "reset") {
                result = await resetPassword(email);
                if (!result.error) setEmailSent(true);
            } else {
                if (!password) {
                    setIsSubmitting(false);
                    return;
                }

                if (mode === "signin") {
                    result = await loginWithPassword(email, password);
                    if (!result.error) onClose();
                } else {
                    result = await signupWithPassword(email, password);
                    if (!result.error) {
                        // Start success state for signup (often requires email confirm)
                        setEmailSent(true);
                    }
                }
            }
        }

        setIsSubmitting(false);
    };

    const getHeaderText = () => {
        if (method === "magic_link") return "Passwordless Login";
        if (mode === "reset") return "Reset Password";
        return mode === "signin" ? "Welcome back" : "Create an account";
    };

    const getDescriptionText = () => {
        if (method === "magic_link") return "Enter your email and we'll send you a login link.";
        if (mode === "reset") return "Enter your email to receive a reset link.";
        return mode === "signin" ? "Enter your credentials to access your account." : "Sign up to get started.";
    };

    const getButtonText = () => {
        if (method === "magic_link") return "Send Magic Link";
        if (mode === "reset") return "Send Reset Link";
        return mode === "signin" ? "Sign In" : "Sign Up";
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                {emailSent ? (
                    // Success / Check Email State
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 text-center bg-zinc-900"
                    >
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                            <Mail className="w-8 h-8 text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
                        <p className="text-white/60 text-sm mb-6 leading-relaxed">
                            {mode === "reset"
                                ? <>Password reset link sent to <span className="text-white font-medium">{email}</span></>
                                : (method === "magic_link"
                                    ? <>We sent a magic link to <span className="text-white font-medium">{email}</span></>
                                    : <>Confirmation link sent to <span className="text-white font-medium">{email}</span></>
                                )
                            }
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
                        >
                            Got it
                        </button>
                    </motion.div>
                ) : (
                    // Main Form
                    <div>
                        {/* Header / Tabs */}
                        {mode !== "reset" && (
                            <div className="flex border-b border-white/5 bg-white/5 relative">
                                <button
                                    onClick={() => setMethod("password")}
                                    className={`flex-1 py-4 text-sm font-medium transition-colors relative z-10 ${method === "password" ? "text-white" : "text-white/40 hover:text-white/60"
                                        }`}
                                >
                                    Password
                                </button>
                                <button
                                    onClick={() => setMethod("magic_link")}
                                    className={`flex-1 py-4 text-sm font-medium transition-colors relative z-10 ${method === "magic_link" ? "text-white" : "text-white/40 hover:text-white/60"
                                        }`}
                                >
                                    Magic Link
                                </button>

                                {/* Animated Underline */}
                                <div className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-out"
                                    style={{
                                        left: method === "password" ? "0%" : "50%",
                                        width: "50%"
                                    }}
                                >
                                    <div className="mx-8 h-full bg-white rounded-t-full" />
                                </div>
                            </div>
                        )}

                        <div className="p-6 overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={method + (mode === "reset" ? "-reset" : "")}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.15, ease: "easeInOut" }}
                                    className="w-full"
                                >
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        {getHeaderText()}
                                    </h2>
                                    <p className="text-white/40 text-sm mb-6">
                                        {getDescriptionText()}
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-white/50 ml-1">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                                <input
                                                    ref={inputRef}
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="you@example.com"
                                                    required
                                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-0 transition-all font-light"
                                                />
                                            </div>
                                        </div>

                                        {/* Password Field - Hide in Magic Link OR Reset mode */}
                                        {method === "password" && mode !== "reset" && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.15, ease: "easeInOut" }}
                                                className="space-y-1 overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-medium text-white/50 ml-1">Password</label>
                                                    {mode === "signin" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setMode("reset")}
                                                            className="text-[10px] font-medium text-white/40 hover:text-white transition-colors"
                                                        >
                                                            Forgot Password?
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                                    <input
                                                        type="password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder="••••••••"
                                                        required
                                                        minLength={6}
                                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-0 transition-all font-light"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        {error && (
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <p className="text-xs text-red-400 font-medium text-center">{error}</p>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    {getButtonText()}
                                                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Footer Links */}
                                    {method === "password" && (
                                        <div className="mt-6 text-center pt-4 border-t border-white/5">
                                            <p className="text-sm text-white/40">
                                                {mode === "reset" ? (
                                                    <button
                                                        onClick={() => setMode("signin")}
                                                        className="text-white font-medium hover:underline focus:outline-none"
                                                    >
                                                        Back to Sign In
                                                    </button>
                                                ) : (
                                                    <>
                                                        {mode === "signin" ? "Don't have an account?" : "Already have an account?"}
                                                        <button
                                                            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                                                            className="ml-1 text-white font-medium hover:underline focus:outline-none"
                                                        >
                                                            {mode === "signin" ? "Sign up" : "Log in"}
                                                        </button>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    {/* Cancel Button */}
                                    <button
                                        onClick={onClose}
                                        className="w-full mt-4 text-xs font-medium text-white/30 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
