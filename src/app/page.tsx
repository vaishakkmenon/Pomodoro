"use client";

import { Suspense, useState } from "react";
import { cx } from "@/ui/cx";
import Timer from "@/components/timer/Timer";
import { SpotifyErrorHandler } from "@/components/spotify/SpotifyErrorHandler";
import { UserMenu } from "@/components/auth/UserMenu";
import { MediaDock } from "@/components/layout/MediaDock";
import { Celebration } from "@/components/ui/Celebration";

import { useTasks } from "@/hooks/useTasks";
import { TaskList } from "@/components/tasks/TaskList";
import { useSettings } from "@/hooks/useSettings";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { usePersistence, PERSIST_KEY } from "@/hooks/usePersistence";
import { useChime } from "@/hooks/useChime";


export default function Home() {
    const { settings, updateSettings } = useSettings();

    // Auth & Tasks
    const {
        tasks,
        activeTaskId,
        addTask,
        deleteTask,
        toggleTask,
        setActiveTask,
        incrementTaskPomodoro
    } = useTasks();



    // Media State
    const [isMediaWide, setIsMediaWide] = useState(false);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // Audio
    const { play: playChime } = useChime("/sounds/chime_1.mp3", settings.sound.volume);

    // Timer Logic
    const timerState = usePomodoroTimer({
        settings,
        onComplete: (prev) => {
            // Play sound
            if (prev === "study" && settings.sound.enabled) {
                playChime();
            }

            // Increment task & Check for completion celebration
            if (prev === "study" && activeTaskId) {
                const justFinishedTask = incrementTaskPomodoro(activeTaskId);
                if (justFinishedTask) {
                    setShowCelebration(true);
                }
            }
        }
    });

    // Persistence
    const { tab, secondsLeft, isRunning, completedStudies, switchTab, setSeconds, start, pause } = timerState;
    usePersistence(
        { tab, secondsLeft, isRunning, completedStudies, switchTab, setSeconds, start, pause },
        PERSIST_KEY
    );

    return (
        <>
            <MediaDock
                settings={settings}
                updateSettings={updateSettings}
                isWide={isMediaWide}
                onToggleWide={() => setIsMediaWide(!isMediaWide)}
                isOpen={isMediaOpen}
                onOpenChange={setIsMediaOpen}
            />

            <Celebration
                show={showCelebration}
                onDismiss={() => setShowCelebration(false)}
            />

            <main
                className={cx(
                    "min-h-screen w-screen overflow-x-hidden relative flex flex-col items-center justify-center py-10 text-white transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                    isMediaWide && isMediaOpen && settings.media?.enabled ? "pl-[62vw]" : "pl-0"
                )}
            >
                {/* Header / Top Right Auth */}
                <div className="absolute top-4 right-4 z-50">
                    <UserMenu />
                </div>

                <Timer
                    timer={timerState}
                    settings={settings}
                    updateSettings={updateSettings}
                />

                <div className="absolute bottom-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <TaskList
                        tasks={tasks}
                        activeTaskId={activeTaskId}
                        addTask={addTask}
                        deleteTask={deleteTask}
                        toggleTask={toggleTask}
                        setActiveTask={setActiveTask}
                    />
                </div>

                <Suspense fallback={null}>
                    <SpotifyErrorHandler />
                </Suspense>
            </main>
        </>
    );
}
