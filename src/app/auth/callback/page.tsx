"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

let isExchangeInProgress = false;

export default function AuthCallbackPage() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying login...");

    useEffect(() => {
        const handleAuth = async () => {
            const searchParams = new URLSearchParams(window.location.search);
            const code = searchParams.get("code");
            const error = searchParams.get("error");

            if (error) {
                setStatus("error");
                setMessage("Link invalid or expired.");
                return;
            }

            // 1. Check if session already exists
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
                handleSuccess();
                return;
            }

            if (!code) {
                setStatus("error");
                setMessage("No login code found.");
                return;
            }

            // 2. Race Condition Logic
            if (isExchangeInProgress) {
                await pollForSession();
                return;
            }

            isExchangeInProgress = true;

            try {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                if (exchangeError) {
                    const isPkceError = exchangeError.message.includes("PKCE") ||
                        exchangeError.message.includes("verifier");

                    if (isPkceError) {
                        await pollForSession();
                        return;
                    }
                    throw exchangeError;
                }

                handleSuccess();

            } catch (err: any) {
                console.error("Auth Error:", err);
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    handleSuccess();
                } else {
                    setStatus("error");
                    setMessage("Login failed. Please request a new link.");
                    isExchangeInProgress = false;
                }
            }
        };

        handleAuth();
    }, []);

    const pollForSession = async () => {
        for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                handleSuccess();
                return;
            }
        }
        setStatus("error");
        setMessage("Verification timed out.");
    };

    // --- THE HYBRID LOGIC ---
    const handleSuccess = () => {
        setStatus("success");
        setMessage("Success! Closing tab...");

        // 1. Notify other tabs immediately
        try {
            const channel = new BroadcastChannel('auth_sync');
            channel.postMessage('login_success');
            channel.close();
        } catch (e) { /* Ignore */ }

        // 2. Attempt to Close
        setTimeout(() => {
            try {
                window.opener = null;
                window.open("", "_self");
                window.close();
            } catch (e) {
                console.warn("Auto-close blocked");
            }

            // 3. IF STILL OPEN after 500ms, update message
            setTimeout(() => {
                if (!document.hidden) {
                    setMessage("You are logged in! You can close this tab now.");
                }
            }, 500);

        }, 1000);
    };

    const isError = status === "error";

    return (
        <div className="min-h-screen grid place-items-center bg-[#0a0a0a] text-white p-4">
            <div className="text-center space-y-6 max-w-sm w-full p-8 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md">
                <div className="flex justify-center">
                    {isError ? (
                        <XCircle className="w-16 h-16 text-red-500" />
                    ) : (
                        status === "success" ?
                            <CheckCircle className="w-16 h-16 text-green-400 animate-in zoom-in" /> :
                            <Loader2 className="w-16 h-16 text-white/50 animate-spin" />
                    )}
                </div>

                <div>
                    <h1 className="text-2xl font-bold mb-2">
                        {isError ? "Login Failed" : (status === "success" ? "You're all set!" : "Verifying...")}
                    </h1>
                    <p className="text-white/60 text-lg leading-relaxed transition-all duration-500">
                        {message}
                    </p>
                </div>

                {/* Show this button ONLY if auto-close failed and user is still here */}
                {status === "success" && message.includes("close this tab") && (
                    <div className="pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2">
                        <Link
                            href="/"
                            className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-6 py-2.5 rounded-full transition-colors"
                        >
                            Click here to open App
                        </Link>
                    </div>
                )}

                {isError && (
                    <button onClick={() => window.location.reload()} className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-full transition-colors">
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
}
