// src/ui/taskTypes.ts
export type Task = {
    id: string; // unique id for React keys & persistence
    title: string;
    estPomodoros: number;
    pomodorosDone: number;
    completed: boolean;
};