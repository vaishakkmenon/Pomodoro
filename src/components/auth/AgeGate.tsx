"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cx } from "@/ui/cx";
import { MINIMUM_AGE, getAge } from "@/lib/age";

interface AgeGateProps {
    open: boolean;
    /** Called when the visitor confirms they are old enough to proceed. */
    onConfirm: () => void;
    /** Called when the gate is dismissed without proceeding. */
    onClose: () => void;
}

export function AgeGate({ open, onConfirm, onClose }: AgeGateProps) {
    const [birthdate, setBirthdate] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [blocked, setBlocked] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset transient state whenever the gate opens.
    useEffect(() => {
        if (open) {
            setBirthdate("");
            setError(null);
            setBlocked(false);
            // Focus the input once the dialog is mounted.
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    // Close on Escape.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const today = new Date().toISOString().split("T")[0];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!birthdate) {
            setError("Please enter your date of birth.");
            return;
        }

        const birth = new Date(birthdate);
        if (Number.isNaN(birth.getTime()) || birth > new Date()) {
            setError("Please enter a valid date of birth.");
            return;
        }

        // Age is evaluated in local state only and is never persisted.
        if (getAge(birth) < MINIMUM_AGE) {
            setBlocked(true);
            return;
        }

        onConfirm();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="age-gate-title"
                className="w-full max-w-md bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
            >
                {blocked ? (
                    <div className="text-center">
                        <h2 id="age-gate-title" className="text-xl font-bold text-white mb-3">
                            Sorry, you&apos;re not eligible
                        </h2>
                        <p className="text-sm text-white/70 mb-6">
                            You must be at least {MINIMUM_AGE} years old to create an account. We do
                            not knowingly collect personal information from children under {MINIMUM_AGE}.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-full transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <h2 id="age-gate-title" className="text-xl font-bold text-white mb-2">
                            Confirm your age
                        </h2>
                        <p className="text-sm text-white/70 mb-5">
                            You must be at least {MINIMUM_AGE} years old to create an account. Enter
                            your date of birth to continue.
                        </p>

                        <label htmlFor="age-gate-dob" className="block text-xs font-medium text-white/60 mb-2">
                            Date of birth
                        </label>
                        <input
                            ref={inputRef}
                            id="age-gate-dob"
                            type="date"
                            max={today}
                            value={birthdate}
                            onChange={(e) => setBirthdate(e.target.value)}
                            className={cx(
                                "w-full bg-white/5 border rounded-lg px-3 py-2.5 text-white outline-none transition-colors [color-scheme:dark]",
                                error ? "border-red-500/60" : "border-white/10 focus:border-white/30"
                            )}
                        />

                        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

                        <p className="text-[11px] leading-relaxed text-white/40 mt-4">
                            By continuing, you affirm that you are at least {MINIMUM_AGE} years of age.
                            Your date of birth is checked on your device only and is never stored. See
                            our{" "}
                            <Link href="/privacy" className="underline hover:text-white/70">
                                Privacy Policy
                            </Link>{" "}
                            and{" "}
                            <Link href="/terms" className="underline hover:text-white/70">
                                Terms
                            </Link>
                            .
                        </p>

                        <div className="flex gap-2 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-transparent hover:bg-white/5 text-white/60 hover:text-white font-medium px-4 py-2.5 rounded-full transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-full transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
