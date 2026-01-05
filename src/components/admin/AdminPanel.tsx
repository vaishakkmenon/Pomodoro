"use client";

import { useState } from "react";
import { useSiteAuth } from "@/hooks/useSiteAuth";
import { supabase } from "@/lib/supabase";



export function AdminPanel() {
    const { user } = useSiteAuth();
    const [emailToAdd, setEmailToAdd] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL;

    // Only show for the admin
    if (!user || !ownerEmail || user.email?.toLowerCase() !== ownerEmail.toLowerCase()) {
        return null;
    }

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
        <div className="fixed bottom-4 left-4 z-50 p-4 bg-zinc-900/90 backdrop-blur border border-white/10 rounded-xl shadow-2xl w-80 animate-in slide-in-from-bottom-2">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Admin Panel</h3>

            <form onSubmit={handleAddUser} className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={emailToAdd}
                        onChange={(e) => setEmailToAdd(e.target.value)}
                        placeholder="New user email"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-white/20"
                        required
                    />
                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                        {status === "loading" ? "..." : "Add"}
                    </button>
                </div>

                {message && (
                    <p className={`text-xs ${status === "success" ? "text-green-400" : "text-red-400"}`}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
}
