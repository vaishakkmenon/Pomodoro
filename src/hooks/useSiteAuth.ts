"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, AuthError } from "@supabase/supabase-js";

interface UseSiteAuthReturn {
    user: User | null;
    isPremium: boolean;
    isLoading: boolean;
    error: string | null;
    login: (email: string) => Promise<{ error: AuthError | null }>;
    loginWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signupWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    logout: () => Promise<void>;
    clearError: () => void;
}

export function useSiteAuth(): UseSiteAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check premium status by querying allowed_users table
    const checkPremiumStatus = useCallback(async (email: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from("allowed_users")
                .select("is_active")
                .eq("email", email.toLowerCase())
                .single();

            if (error) {
                // PGRST116 = no rows found, which means not premium
                if (error.code === "PGRST116") {
                    return false;
                }
                console.error("[Auth] Premium check error:", error);
                return false;
            }

            return data?.is_active ?? false;
        } catch (err) {
            console.error("[Auth] Premium check failed:", err);
            return false;
        }
    }, []);

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser?.email) {
                const premium = await checkPremiumStatus(currentUser.email);
                setIsPremium(premium);
            }

            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser?.email) {
                    const premium = await checkPremiumStatus(currentUser.email);
                    setIsPremium(premium);
                } else {
                    setIsPremium(false);
                }

                // Clear error on successful login
                if (event === "SIGNED_IN") {
                    setError(null);
                    // Clean up URL hash (access_token)
                    if (typeof window !== "undefined" && window.location.hash) {
                        window.history.replaceState(null, "", window.location.pathname + window.location.search);
                    }
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [checkPremiumStatus]);

    // Handle cross-tab login sync
    useEffect(() => {
        if (typeof window === "undefined") return;

        const channel = new BroadcastChannel('auth_sync');
        channel.onmessage = (event) => {
            if (event.data === 'login_success') {
                console.log("Global Auth: Received login signal from another tab");
                // Reload or refetch session. For now, a hard reload ensures clean state.
                window.location.reload();
            }
        };

        return () => {
            channel.close();
        };
    }, []);

    // Magic Link login
    const login = useCallback(async (email: string) => {
        setError(null);

        const { error } = await supabase.auth.signInWithOtp({
            email: email.toLowerCase().trim(),
            options: {
                // Redirect back to the app after clicking the magic link
                emailRedirectTo: typeof window !== "undefined"
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
            },
        });

        if (error) {
            setError(error.message);
        }

        return { error };
    }, []);

    // Password Login
    const loginWithPassword = useCallback(async (email: string, password: string) => {
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
        });
        if (error) setError(error.message);
        return { error };
    }, []);

    // Password Signup
    const signupWithPassword = useCallback(async (email: string, password: string) => {
        setError(null);
        const { error } = await supabase.auth.signUp({
            email: email.toLowerCase().trim(),
            password,
            options: {
                // If email confirmation is enabled, this manages the redirect
                emailRedirectTo: typeof window !== "undefined"
                    ? `${window.location.origin}/auth/callback`
                    : undefined,
            }
        });
        if (error) setError(error.message);
        return { error };
    }, []);

    // Password Reset
    const resetPassword = useCallback(async (email: string) => {
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
            redirectTo: typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?type=recovery`
                : undefined,
        });
        if (error) setError(error.message);
        return { error };
    }, []);

    // Logout
    const logout = useCallback(async () => {
        console.log("Logout hook: starting");
        setError(null);

        // 1. Clear Spotify session first (if connected)
        try {
            console.log("Logout hook: calling spotify logout api");
            await fetch("/api/spotify/logout", {
                method: "POST",
                credentials: "include"
            });
            console.log("Logout hook: spotify logout api done");
        } catch (e) {
            console.error("Logout hook: spotify api failed", e);
        }

        // 2. Optimistic update: Clear state immediately so UI feels responsive
        console.log("Logout hook: clearing local state");
        setUser(null);
        setIsPremium(false);

        // 3. Supabase SignOut (Scope: local ensures we don't hang on network)
        await supabase.auth.signOut({ scope: 'local' }).catch(err => {
            console.error("Logout hook: supabase signout failed", err);
        });

        // 4. Nuclear option: Explicitly clear any lingering client-side cookies AND storage
        if (typeof document !== "undefined") {
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            // Clear local storage (where Supabase persists session)
            localStorage.clear();
            sessionStorage.clear();
        }

        // 5. Hard reload the page to reset all states and prevent any modal popups
        console.log("Logout hook: redirecting to root");
        window.location.href = "/";
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        user,
        isPremium,
        isLoading,
        error,
        login,
        loginWithPassword,
        signupWithPassword,
        resetPassword,
        logout,
        clearError,
    };
}
