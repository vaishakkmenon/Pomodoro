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
        const newTasks = state.tasks.map((t) => {
            if (t.id === id) {
                const newCompleted = t.completedPomodoros + 1;
                // Auto-complete if goal reached (and wasn't already complete)
                const goalReached = newCompleted >= t.estimatedPomodoros;
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
        updateState({ ...state, tasks: newTasks });
        return justCompleted;
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
    };
}
