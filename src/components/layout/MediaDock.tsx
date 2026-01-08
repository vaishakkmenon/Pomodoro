import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cx } from "@/ui/cx";
import { ChevronRight, ChevronLeft, Youtube, Maximize2, Minimize2, X, CloudRain } from "lucide-react";
import { YouTubePlayer } from "@/components/media/YouTubePlayer";
import { SpotifyPlaceholder } from "@/components/media/SpotifyPlaceholder";
import { AmbientPlayer } from "@/components/media/AmbientPlayer";
import { Settings } from "@/types/settings";

type Tab = "spotify" | "youtube" | "sounds";

interface MediaDockProps {
    settings: Settings;
    updateSettings: (s: Partial<Settings>) => void;
    isWide: boolean;
    onToggleWide: () => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isTimerMenuOpen?: boolean;
}

export function MediaDock({
    settings,
    updateSettings,
    isWide,
    onToggleWide,
    isOpen,
    onOpenChange,
    isTimerMenuOpen = false
}: MediaDockProps) {
    const [activeTab, setActiveTab] = useState<Tab>("youtube");

    // Dynamic sizing based on visibility of Timer Menu
    // If Timer Menu is OPEN (Timer uses ~36rem), we use 55vw (smaller).
    // If Timer Menu is CLOSED (Timer uses ~32rem), we use 60vw (larger).
    const expandedWidth = isTimerMenuOpen ? "55vw" : "60vw";


    const toggleOpen = () => onOpenChange(!isOpen);

    const closeDock = () => {
        updateSettings({ media: { ...settings.media, enabled: false } });
    };

    const handleTabChange = (tab: Tab) => {
        // Toggle close if clicking currently active tab while open
        if (isOpen && activeTab === tab) {
            onOpenChange(false);
            return;
        }

        setActiveTab(tab);
        if (tab === "spotify" && isWide) {
            onToggleWide(); // Spotify doesn't support wide/theater mode
        }
        if (!isOpen) onOpenChange(true);
    };

    const toggleTheaterMode = () => {
        if (activeTab === "youtube") {
            onToggleWide();
        }
    };

    return (
        <AnimatePresence>
            {settings.media?.enabled && (
                <motion.div
                    layout
                    initial={{ opacity: 0, width: "60px", height: "225px" }}
                    animate={{
                        opacity: 1,
                        width: !isOpen ? "60px" : isWide ? expandedWidth : "30vw",
                        height: !isOpen ? "285px" : isWide ? "70vh" : "50vh",
                    }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    className={cx(
                        // Base layout
                        "z-40 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex",

                        // Positioning Logic
                        (isOpen && isWide)
                            ? "fixed left-4 top-1/2 -translate-y-1/2" // Wide Mode: Fixed to viewport left
                            : "fixed left-4 top-1/2 -translate-y-1/2 md:absolute md:left-auto md:right-full md:mr-3" // Normal (Open or Closed): Absolute anchored to Timer
                    )}
                >
                    {/* Content Area */}
                    <div className="flex-1 h-full relative min-w-0 overflow-hidden">
                        {activeTab === "youtube" ? (
                            <YouTubePlayer isWide={isWide} toggleTheaterMode={toggleTheaterMode} />
                        ) : activeTab === "sounds" ? (
                            <AmbientPlayer />
                        ) : (
                            <SpotifyPlaceholder />
                        )}

                        {/* Theater Mode Toggle (YouTube Only) */}
                        {activeTab === "youtube" && (
                            <button
                                onClick={toggleTheaterMode}
                                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-black/50 hover:bg-black/70 rounded-lg transition-colors z-50 backdrop-blur-sm"
                                title={isWide ? "Exit Theater Mode" : "Theater Mode"}
                            >
                                {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                        )}
                    </div>

                    {/* Sidebar / Icons */}
                    <div className="w-[60px] flex flex-col items-center py-3 gap-2 bg-white/5 border-l border-white/5 flex-shrink-0 z-10 h-full relative">
                        {/* Close Button */}
                        <button
                            onClick={closeDock}
                            className="p-2 text-white/20 hover:text-white/80 hover:bg-white/10 rounded-lg transition-all"
                            title="Remove Dock"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <button
                            onClick={toggleOpen}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                        >
                            {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={() => {
                                // Spotify Unavailable Logic
                                // For now, we just do nothing or could show a toast.
                                // Since we don't have a toast system ready in this file, we'll just ignore or log.
                                // User requested "mark it as unavailable if clicked on" -> simple alert for now?
                                // Better: just don't set active, maybe shake?
                                // Let's prevent the tab change.
                            }}
                            className={cx(
                                "p-3 rounded-xl transition-all duration-300 relative group cursor-not-allowed",
                                activeTab === "spotify" && isOpen ? "text-emerald-400 bg-emerald-400/10" : "text-white/20"
                            )}
                            title="Spotify (Coming Soon)"
                        >
                            <svg className="w-5 h-5 blur-[1px] opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            {/* No active indicator logic needed since it can't be active */}
                        </button>

                        <div className="w-8 h-px bg-white/10" />

                        <button
                            onClick={() => handleTabChange("youtube")}
                            className={cx(
                                "p-3 rounded-xl transition-all duration-300 relative",
                                activeTab === "youtube" && isOpen ? "text-red-400 bg-red-400/10" : "text-white/40 hover:text-white"
                            )}
                        >
                            <Youtube className="w-5 h-5" />
                            {activeTab === "youtube" && isOpen && (
                                <motion.div
                                    layoutId="active-tab"
                                    className="absolute inset-0 rounded-xl border-2 border-red-400/20"
                                />
                            )}
                        </button>

                        <div className="w-8 h-px bg-white/10" />

                        <button
                            onClick={() => handleTabChange("sounds")}
                            className={cx(
                                "p-3 rounded-xl transition-all duration-300 relative",
                                activeTab === "sounds" && isOpen ? "text-sky-400 bg-sky-400/10" : "text-white/40 hover:text-white"
                            )}
                        >
                            <CloudRain className="w-5 h-5" />
                            {activeTab === "sounds" && isOpen && (
                                <motion.div
                                    layoutId="active-tab"
                                    className="absolute inset-0 rounded-xl border-2 border-sky-400/20"
                                />
                            )}
                        </button>
                    </div>                </motion.div>
            )}
        </AnimatePresence>
    );
}
