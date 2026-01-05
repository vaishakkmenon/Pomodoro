"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";


export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (password !== confirmPassword) {
            setStatus("error");
            setMessage("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setStatus("error");
            setMessage("Password must be at least 6 characters");
            return;
        }

        setIsSubmitting(true);
        setStatus("idle");

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setStatus("success");
            setMessage("Password updated successfully!");

            // Attempt to close tab after 2.5s
            setTimeout(() => {
                window.opener = null;
                window.open("", "_self");
                window.close();
            }, 5000);


        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to update password";
            setStatus("error");
            setMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center bg-[#0a0a0a] text-white p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Lock className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
                    <p className="text-white/60 text-sm">
                        Please enter a secure password for your account.
                    </p>
                </div>

                {status === "success" ? (
                    <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">All Set!</h2>
                        <p className="text-white/60 text-sm mb-6">Closing this tab in a few seconds...</p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => window.close()}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                                Close Tab Now
                            </button>
                            <button
                                onClick={() => router.push("/")}
                                className="text-xs text-white/30 hover:text-white transition-colors"
                            >
                                Return to App
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1" suppressHydrationWarning>
                            <label className="text-xs font-medium text-white/50 ml-1">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-0 transition-all font-light"
                            />
                        </div>

                        <div className="space-y-1" suppressHydrationWarning>
                            <label className="text-xs font-medium text-white/50 ml-1">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:ring-0 transition-all font-light"
                            />
                        </div>

                        {status === "error" && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in slide-in-from-top-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p>{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    Update Password
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
