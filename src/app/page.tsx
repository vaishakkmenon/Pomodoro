"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
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
        incrementTaskPomodoro,
        updateTaskEstimate
    } = useTasks();



    // Media State
    const [isMediaWide, setIsMediaWide] = useState(false);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const [timerMenuOpen, setTimerMenuOpen] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // Audio
    const { play: playChime } = useChime("/sounds/chime_1.mp3", settings.sound.volume);

    // Global Progress Calculation
    const totalEst = tasks.reduce((acc, t) => acc + t.estimatedPomodoros, 0);
    const totalDone = tasks.reduce((acc, t) => acc + t.completedPomodoros, 0);


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

    const { tab, secondsLeft, isRunning, completedStudies, switchTab, setSeconds, start, pause } = timerState;

    // Global Progress Calculation (Depends on timerState)
    // Formula: We treat the entire set of tasks as a single timeline: [Work] [Break] [Work] [Break] ...
    // We approximate that every task unit is followed by a short break (except the last one).
    // Future improvement: Handle long breaks explicitly if needed.
    let globalProgress: number | null = null;
    if (tasks.length > 0 && totalEst > 0) {
        const { work, shortBreak } = settings.durations;
        const workSec = work * 60;
        const breakSec = shortBreak * 60; // Use short break as standard "gap" size for estimation

        // 1. Total Project Duration (Estimated)
        // Works + Gaps. Gaps = TotalEst - 1 (roughly)
        const totalGaps = Math.max(0, totalEst - 1);
        const totalDurationSec = (totalEst * workSec) + (totalGaps * breakSec);

        // 2. Elapsed Duration
        // Base: Fully completed pomodoros
        let elapsedSec = totalDone * workSec;

        // Add completed gaps
        // If we are in Study: We must have finished 'totalDone' breaks? 
        // Logic: If I've done 1 pom, I'm now studying for #2. That means Break #1 happened.
        // So if phase == study, gaps passed = totalDone.
        // If phase == break, gaps passed = totalDone - 1 (the current one is happening).
        const textPhase = timerState.phaseKind === "study" ? "study" : "break";

        const gapsPassed = textPhase === "study"
            ? totalDone
            : Math.max(0, totalDone - 1);

        elapsedSec += gapsPassed * breakSec;

        // If Study: Add (WorkDur - SecondsLeft)
        // If Break: Add (BreakDur - SecondsLeft)
        // Note: For 'long break', this might feel slightly off scale if we use shortBreak for estimation, 
        // but visually it's smoother to just map current progress.
        // Actually, let's use the REAL current duration for precise seconds.
        const actualCurrentTotal = (tab === "study" ? work : tab === "short" ? shortBreak : settings.durations.longBreak) * 60;

        const currentElapsed = Math.max(0, actualCurrentTotal - timerState.secondsLeft);

        // Improve "Elapsed" adding for current session
        // Only if consistent with our "Timeline" model.
        // If we are in a 'Long Break' but our model assumed 'Short Break', we might overflow?
        // Let's stick to the model: The model allocates 'breakSec' slots. 
        // If the real break is longer, the bar might move slower or hang, but it won't break 100%.
        // Let's just add `currentElapsed` but cap it at the slot size we allocated? 
        // Or simpler: Just add it. The error margin is small enough for UI.

        elapsedSec += currentElapsed;

        globalProgress = Math.min(100, (elapsedSec / totalDurationSec) * 100);
    }

    usePersistence(
        { tab, secondsLeft, isRunning, completedStudies, switchTab, setSeconds, start, pause },
        PERSIST_KEY
    );

    return (
        <>

            <Celebration
                show={showCelebration}
                onDismiss={() => setShowCelebration(false)}
            />

            <motion.main
                initial={{ paddingLeft: "0rem" }}
                animate={{
                    paddingLeft: isMediaWide && isMediaOpen && settings.media?.enabled
                        ? (timerMenuOpen ? "calc(55vw + 1.5rem)" : "calc(60vw + 1.5rem)")
                        : "0rem"
                }}
                transition={{
                    duration: 0.5,
                    ease: [0.25, 1, 0.5, 1]
                }}
                className={cx(
                    "min-h-screen w-screen relative flex flex-col items-center justify-center py-10 text-[var(--text-primary)]"
                )}
            >


                <div className="relative">
                    <MediaDock
                        settings={settings}
                        updateSettings={updateSettings}
                        isWide={isMediaWide}
                        onToggleWide={() => setIsMediaWide(!isMediaWide)}
                        isOpen={isMediaOpen}
                        onOpenChange={setIsMediaOpen}
                        isTimerMenuOpen={timerMenuOpen}
                    />
                    <Timer
                        timer={timerState}
                        settings={settings}
                        updateSettings={updateSettings}
                        globalProgress={globalProgress}
                        isMenuOpen={timerMenuOpen}
                        onMenuOpenChange={setTimerMenuOpen}
                    />
                </div>

                <div className="w-full max-w-lg mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <TaskList
                        tasks={tasks}
                        activeTaskId={activeTaskId}
                        addTask={addTask}
                        deleteTask={deleteTask}
                        toggleTask={(id) => {
                            const task = tasks.find(t => t.id === id);
                            if (task && !task.isComplete) {
                                // We are about to mark it complete.
                                // Check if all OTHER tasks are already complete.
                                const otherTasks = tasks.filter(t => t.id !== id);
                                const allOthersComplete = otherTasks.every(t => t.isComplete);
                                if (allOthersComplete) {
                                    setShowCelebration(true);
                                }
                            }
                            toggleTask(id);
                        }}
                        setActiveTask={setActiveTask}
                        updateTaskEstimate={updateTaskEstimate}
                    />
                </div>

                <Suspense fallback={null}>
                    <SpotifyErrorHandler />
                </Suspense>
            </motion.main>
        </>
    );
}
