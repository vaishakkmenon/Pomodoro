"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle } from "lucide-react";

export default function AuthCallbackPage() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying login...");

    useEffect(() => {
        // 1. Check for errors in the URL hash OR search params (PKCE)
        const checkError = (params: URLSearchParams) => {
            const errorDescription = params.get("error_description");
            const errorCode = params.get("error_code");
            // const type = params.get("type"); // We handle this later now

            if (errorDescription || errorCode) {
                setStatus("error");
                setMessage(errorDescription?.replace(/\+/g, " ") || "Login link is invalid or expired.");
                window.history.replaceState(null, "", window.location.pathname);
                return true;
            }
            return false;
        };

        if (window.location.hash && checkError(new URLSearchParams(window.location.hash.substring(1)))) return;
        const searchParams = new URLSearchParams(window.location.search);
        if (window.location.search && checkError(searchParams)) return;

        // Check if this is a recovery flow
        const isRecovery = searchParams.get("type") === "recovery" ||
            new URLSearchParams(window.location.hash.substring(1)).get("type") === "recovery";

        // 2. If no obvious error in hash, check Supabase session
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                setStatus("error");
                setMessage(error.message || "Login failed.");
                return;
            }

            if (session) {
                if (isRecovery) {
                    // Redirect to password update if recovery flow
                    window.location.replace("/auth/update-password");
                } else {
                    setStatus("success");
                    setMessage("You are logged in! Closing tab...");
                    window.history.replaceState(null, "", window.location.pathname);
                    setTimeout(() => {
                        window.opener = null;
                        window.open("", "_self");
                        window.close();
                    }, 5000);
                }
            } else {
                // Listen for auth changes if no session yet
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && isRecovery)) {
                        window.location.replace("/auth/update-password");
                        return;
                    }

                    if (event === "SIGNED_IN" && session) {
                        setStatus("success");
                        // delay message update to prevent flash if immediate close works (unlikely but safe)
                        setMessage("You are logged in! Closing tab...");
                        window.history.replaceState(null, "", window.location.pathname);
                        setTimeout(() => {
                            window.opener = null;
                            window.open("", "_self");
                            window.close();
                        }, 2500);
                    }
                });

                // If we timeout after 8 seconds, give user manual option
                setTimeout(() => {
                    setStatus((prev) => {
                        if (prev === "loading") {
                            setMessage("Taking longer than expected... Check your connection or try reloading.");
                            return "error";
                        }
                        return prev;
                    });
                }, 8000);
            }
        };

        checkSession();
    }, []);

    const isError = status === "error";

    return (
        <div className="min-h-screen grid place-items-center bg-[#0a0a0a] text-white p-4">
            <div className="text-center space-y-4 max-w-sm w-full p-8 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md transition-all">
                <div className="flex justify-center mb-6">
                    {isError ? (
                        <XCircle className="w-16 h-16 text-red-500 animate-in zoom-in duration-500" />
                    ) : (
                        <CheckCircle className={`w-16 h-16 ${status === "loading" ? "text-white/20 animate-pulse" : "text-green-400 animate-in zoom-in duration-500"}`} />
                    )}
                </div>

                <h1 className="text-2xl font-bold tracking-tight">
                    {isError ? "Login Failed" : (status === "loading" ? "Verifying..." : "Success!")}
                </h1>
                <p className="text-white/60 text-lg leading-relaxed">
                    {message}
                </p>

                <div className="pt-6 border-t border-white/10 mt-6">
                    {message.includes("Taking longer") ? (
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-full transition-colors"
                        >
                            Reload Page
                        </button>
                    ) : (
                        <p className="text-sm text-white/40">
                            {isError ? "Please request a new login link." : "You can safely close this tab and return to the app."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
