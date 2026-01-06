"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CelebrationProps {
    show: boolean;
    onDismiss: () => void;
    message?: string;
}

const DEFAULT_MESSAGE = "Great work! Time for a break 🎉";

export function Celebration({ show, onDismiss, message = DEFAULT_MESSAGE }: CelebrationProps) {
    useEffect(() => {
        if (show) {
            // Trigger confetti
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#34D399', '#60A5FA', '#F472B6'] // Emerald, Sky, Pink
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#34D399', '#60A5FA', '#F472B6']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };

            frame();

            // Auto dismiss after 4 seconds
            const timer = setTimeout(onDismiss, 4000);
            return () => clearTimeout(timer);
        }
    }, [show, onDismiss]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                >
                    <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/10 text-center shadow-2xl relative pointer-events-auto max-w-sm mx-4">
                        <button
                            onClick={onDismiss}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-4xl mb-4">🍅</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
                        <p className="text-white/80 text-lg leading-relaxed">
                            {message}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
