"use client";

import { Suspense, useState } from "react";
import { cx } from "@/ui/cx";
import Timer from "@/components/timer/Timer";
import { SpotifyErrorHandler } from "@/components/spotify/SpotifyErrorHandler";

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

    // Global Progress Calculation
    const totalEst = tasks.reduce((acc, t) => acc + t.estimatedPomodoros, 0);
    const totalDone = tasks.reduce((acc, t) => acc + t.completedPomodoros, 0);
    const workDuration = settings.durations.work * 60;

    // Timer Logic
    const timerState = usePomodoroTimer({
        settings,
        onComplete: (prev) => {
            // Play sound
            if (prev === "study" && settings.sound.enabled) {
                playChime();
            }

            // Increment task
            if (prev === "study" && activeTaskId) {
                incrementTaskPomodoro(activeTaskId);
            }

            // Celebration Logic
            if (prev === "study") {
                if (tasks.length > 0) {
                    // Celebrate only if ALL tasks are effectively done
                    // Check if (totalDone + 1) >= totalEst
                    if ((totalDone + 1) >= totalEst) {
                        setShowCelebration(true);
                    }
                } else {
                    // No tasks: Celebration every session (classic mode)
                    setShowCelebration(true);
                }
            }
        }
    });

    // Global Progress Calculation (Depends on timerState)
    let globalProgress: number | null = null;
    if (tasks.length > 0 && totalEst > 0) {
        const workDuration = settings.durations.work * 60;
        // Current session progress (only if in study mode)
        // We cap partial progress at 1 unit to avoid over-crediting
        const currentSessionRatio = (timerState.phaseKind === "study")
            ? Math.max(0, 1 - timerState.secondsLeft / workDuration)
            : 0;

        // Formula: (Total Finished Units + Current Partial Unit) / Total Estimated Units
        globalProgress = Math.min(100, ((totalDone + currentSessionRatio) / totalEst) * 100);
    }

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


                <Timer
                    timer={timerState}
                    settings={settings}
                    updateSettings={updateSettings}
                    globalProgress={globalProgress}
                />

                <div className="w-full max-w-lg mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
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
