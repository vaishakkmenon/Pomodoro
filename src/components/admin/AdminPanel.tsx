"use client";

import { useState } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";
import { supabase } from "@/lib/supabase";



import type { User } from "@supabase/supabase-js";

interface AdminPanelProps {
    isModal?: boolean;
    onClose?: () => void;
    user?: User | null; // Optional prop to avoid re-fetching
}

export function AdminPanel({ isModal = false, onClose, user: propUser }: AdminPanelProps) {
    const { user: hookUser } = useSiteAuth();
    const user = propUser || hookUser;

    const [emailToAdd, setEmailToAdd] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL;

    // Check if we have a user (either from prop or hook)
    if (!user || !ownerEmail || user.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
        return null;
    }

    const containerClasses = isModal
        ? "bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-sm"
        : "fixed bottom-4 left-4 z-50 p-4 bg-zinc-900/90 backdrop-blur border border-white/10 rounded-xl shadow-2xl w-80 animate-in slide-in-from-bottom-2";

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            const res = await fetch("/api/spotify/admin/add-user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ email: emailToAdd }),
            });

            if (!res.ok) throw new Error("Failed to add user");

            setStatus("success");
            setMessage(`Added ${emailToAdd}!`);
            setEmailToAdd("");

            // Clear success message after 3s
            setTimeout(() => {
                setStatus("idle");
                setMessage("");
            }, 3000);

        } catch (err) {
            setStatus("error");
            setMessage("Error adding user.");
        }
    };

    return (
        <div className={containerClasses}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Admin Panel</h3>
                {isModal && onClose && (
                    <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
                        ✕
                    </button>
                )}
            </div>



            <form onSubmit={handleAddUser} className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={emailToAdd}
                        onChange={(e) => setEmailToAdd(e.target.value)}
                        placeholder="New user email"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10 placeholder:text-white/20"
                        required
                    />
                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="bg-white text-black hover:bg-white/90 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {status === "loading" ? "..." : "Add"}
                    </button>
                </div>

                {message && (
                    <p className={`mt-2 text-xs font-medium text-center ${status === "success" ? "text-green-400" : "text-red-400"}`}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}
