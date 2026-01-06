import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cx } from "@/ui/cx";
import { ChevronRight, ChevronLeft, Youtube, Maximize2, Minimize2, X } from "lucide-react";
import { YouTubePlayer } from "@/components/media/YouTubePlayer";
import { SpotifyPlaceholder } from "@/components/media/SpotifyPlaceholder";


type Tab = "spotify" | "youtube";

import { Settings } from "@/types/settings";

interface MediaDockProps {
    settings: Settings;
    updateSettings: (s: Partial<Settings>) => void;
}

export function MediaDock({ settings, updateSettings }: MediaDockProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isWide, setIsWide] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("youtube");



    const toggleOpen = () => setIsOpen(!isOpen);

    const closeDock = () => {
        updateSettings({ media: { ...settings.media, enabled: false } });
    };

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "spotify") {
            setIsWide(false); // Spotify doesn't support wide/theater mode
        }
        if (!isOpen) setIsOpen(true);
    };

    const toggleTheaterMode = () => {
        if (activeTab === "youtube") {
            setIsWide(!isWide);
        }
    };

    return (
        <AnimatePresence>
            {settings.media?.enabled && (
                <motion.div
                    initial={{ opacity: 0, width: 60, height: 300 }}
                    animate={{
                        opacity: 1,
                        width: !isOpen ? 60 : isWide ? 800 : 450,
                        height: !isOpen ? 300 : 500,
                    }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed left-4 top-1/2 -translate-y-1/2 z-40 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex"
                >
                    {/* Sidebar / Icons */}
                    <div className="w-[60px] flex flex-col items-center pt-14 pb-6 gap-4 bg-white/5 border-r border-white/5 flex-shrink-0 z-10 h-full relative">
                        {/* Close Button */}
                        <button
                            onClick={closeDock}
                            className="absolute top-3 left-1/2 -translate-x-1/2 p-2 text-white/20 hover:text-white/80 hover:bg-white/10 rounded-lg transition-all"
                            title="Remove Dock"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <button
                            onClick={toggleOpen}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                        >
                            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>

                        <div className="w-8 h-px bg-white/10" />

                        <button
                            onClick={() => handleTabChange("spotify")}
                            className={cx(
                                "p-3 rounded-xl transition-all duration-300 relative",
                                activeTab === "spotify" && isOpen ? "text-emerald-400 bg-emerald-400/10" : "text-white/40 hover:text-white"
                            )}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            {activeTab === "spotify" && isOpen && (
                                <motion.div
                                    layoutId="active-tab"
                                    className="absolute inset-0 rounded-xl border-2 border-emerald-400/20"
                                />
                            )}
                        </button>

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
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 h-full relative">
                        {activeTab === "youtube" ? (
                            <YouTubePlayer isWide={isWide} toggleTheaterMode={toggleTheaterMode} />
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
                </motion.div>
            )}
        </AnimatePresence>
    );
}
