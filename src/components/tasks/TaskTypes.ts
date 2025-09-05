export type Task = {
    id: string;
    title: string;
    estPomodoros: number;
    pomodorosDone: number;
    completed: boolean;
};


export function createTask(title: string, estPomodoros: number): Task {
    return {
        id: crypto.randomUUID(),
        title: title.trim(),
        estPomodoros: Math.max(1, Math.floor(estPomodoros || 1)),
        pomodorosDone: 0,
        completed: false,
    };
}