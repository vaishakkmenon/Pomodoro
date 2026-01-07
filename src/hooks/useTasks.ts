import { useState, useEffect, useCallback } from "react";
import { Task } from "@/types/task";

const STORAGE_KEY = "pomodoro:tasks:v1";

interface TaskState {
    tasks: Task[];
    activeTaskId: string | null;
}

export function useTasks() {
    const [state, setState] = useState<TaskState>({
        tasks: [],
        activeTaskId: null,
    });

    // Hydrate from localStorage
    useEffect(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);

                // Auto-select first incomplete task if none is active
                if (!parsed.activeTaskId && parsed.tasks.length > 0) {
                    const firstIncomplete = parsed.tasks.find((t: Task) => !t.isComplete);
                    if (firstIncomplete) {
                        parsed.activeTaskId = firstIncomplete.id;
                    }
                }

                setState(parsed);
            } catch (error) {
                console.error("Failed to parse tasks:", error);
            }
        }
    }, []);

    // Persist on change
    const updateState = useCallback((newState: TaskState) => {
        setState(newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    }, []);

    const addTask = useCallback((title: string, estimatedPomodoros: number) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            estimatedPomodoros,
            completedPomodoros: 0,
            isComplete: false,
            createdAt: Date.now(),
        };
        updateState({
            ...state,
            tasks: [...state.tasks, newTask],
            // If it's the first task, make it active
            activeTaskId: state.tasks.length === 0 ? newTask.id : state.activeTaskId,
        });
    }, [state, updateState]);

    const deleteTask = useCallback((id: string) => {
        const newTasks = state.tasks.filter((t) => t.id !== id);

        // If we deleted the active task, auto-select the next incomplete one
        let newActiveId = state.activeTaskId;
        if (state.activeTaskId === id) {
            const nextTask = newTasks.find(t => !t.isComplete);
            newActiveId = nextTask ? nextTask.id : null;
        }

        updateState({
            ...state,
            tasks: newTasks,
            activeTaskId: newActiveId,
        });
    }, [state, updateState]);

    const toggleTask = useCallback((id: string) => {
        const newTasks = state.tasks.map((t) =>
            t.id === id ? { ...t, isComplete: !t.isComplete } : t
        );
        updateState({ ...state, tasks: newTasks });
    }, [state, updateState]);

    const incrementTaskPomodoro = useCallback((id: string) => {
        let justCompleted = false;
        let nextActiveId = state.activeTaskId;

        const newTasks = state.tasks.map((t) => {
            if (t.id === id) {
                // Cap at estimated
                const newCompleted = Math.min(t.completedPomodoros + 1, t.estimatedPomodoros);

                // Check completion (hit estimate)
                const goalReached = newCompleted >= t.estimatedPomodoros;

                // If it wasn't complete before but is now
                if (goalReached && !t.isComplete) {
                    justCompleted = true;
                }

                return {
                    ...t,
                    completedPomodoros: newCompleted,
                    isComplete: t.isComplete || goalReached
                };
            }
            return t;
        });

        // Auto-advance logic if just completed
        if (justCompleted) {
            // Find current index
            const currentIndex = newTasks.findIndex(t => t.id === id);
            if (currentIndex !== -1) {
                // Look for next incomplete task after this one
                const nextTask = newTasks.find((t, i) => i > currentIndex && !t.isComplete);
                // If found, switch to it using the ID from the UPDATED list (though IDs don't change)
                if (nextTask) {
                    nextActiveId = nextTask.id;
                } else {
                    // Optional: Wrap around? Or just deselect? 
                    // Let's look from start if we want wrap-around, but standard behavior usually stops or stays.
                    // Let's try to find ANY incomplete task if we haven't found one yet (wrapping)
                    // const anyNext = newTasks.find(t => !t.isComplete && t.id !== id);
                    // if (anyNext) nextActiveId = anyNext.id;
                    // User requested "next task". Linear progression is safest.
                }
            }
        }

        updateState({
            ...state,
            tasks: newTasks,
            activeTaskId: nextActiveId
        });
        return justCompleted;
    }, [state, updateState]);

    const updateTaskEstimate = useCallback((id: string, newEstimate: number) => {
        const newTasks = state.tasks.map((t) => {
            if (t.id === id) {
                // Ensure estimate is at least 1 and >= completed (optional, but safest to cap lower bound)
                const safeEstimate = Math.max(1, newEstimate);
                // Also, if we lower estimate below completed, should we cap completed? 
                // Or just let it be weird? Better to keep completed as is physics, but maybe unmark complete?
                // Let's simplify: Set estimate. If safeEstimate <= completed, mark complete?
                const isNowComplete = t.completedPomodoros >= safeEstimate;

                return {
                    ...t,
                    estimatedPomodoros: safeEstimate,
                    isComplete: isNowComplete
                };
            }
            return t;
        });
        updateState({ ...state, tasks: newTasks });
    }, [state, updateState]);

    const setActiveTask = useCallback((id: string | null) => {
        updateState({ ...state, activeTaskId: id });
    }, [state, updateState]);

    return {
        tasks: state.tasks,
        activeTaskId: state.activeTaskId,
        addTask,
        deleteTask,
        toggleTask,
        incrementTaskPomodoro,
        setActiveTask,
        updateTaskEstimate,
    };
}
