export interface Task {
    id: string;
    title: string;
    estimatedPomodoros: number;
    completedPomodoros: number;
    isComplete: boolean;
    createdAt: number;
}
