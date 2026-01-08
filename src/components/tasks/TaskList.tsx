import { useState, useEffect } from "react";
import { Task } from "@/types/task";
import { TaskItem } from "./TaskItem";
import { Plus } from "lucide-react";
import { cx } from "@/ui/cx";
import { AnimatePresence, motion } from "framer-motion";

interface TaskListProps {
    tasks: Task[];
    activeTaskId: string | null;
    addTask: (title: string, estimatedPomodoros: number) => void;
    deleteTask: (id: string) => void;
    toggleTask: (id: string) => void;
    setActiveTask: (id: string | null) => void;
    updateTaskEstimate: (id: string, n: number) => void;
}

// Add import at top
import { useSettings } from "@/hooks/useSettings";

export function TaskList({ tasks, activeTaskId, addTask, deleteTask, toggleTask, setActiveTask, updateTaskEstimate }: TaskListProps) {
    const { settings } = useSettings();
    const [isAdding, setIsAdding] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [estPomodoros, setEstPomodoros] = useState(1);

    // Force re-render periodically to update relative time
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30000); // 30s update
        return () => clearInterval(interval);
    }, []);

    // Calculate Finish Time
    const incompleteTasks = tasks.filter(t => !t.isComplete);
    const totalRemainingPomodoros = incompleteTasks.reduce((acc, t) => acc + (t.estimatedPomodoros - t.completedPomodoros), 0);
    const workDuration = settings.durations.work;
    const shortBreak = settings.durations.shortBreak;
    // Simple calc: (work + shortBreak) * remaining. 
    // Ideally we add long breaks, but let's start simple.
    const totalMinutes = totalRemainingPomodoros * (workDuration + shortBreak);

    const finishTime = new Date(Date.now() + totalMinutes * 60000);
    const calculatedTimeStr = finishTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // ... handleSubmit ...
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle.trim()) {
            addTask(newTitle.trim(), estPomodoros);
            setNewTitle("");
            setEstPomodoros(1);
            setIsAdding(false);
        }
    };

    return (
        <div className="w-full max-w-[min(90vw,28rem)] mx-auto">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between mb-2 group text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className={cx("transition-transform duration-200", isExpanded ? "rotate-0" : "-rotate-90")}>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold">Tasks</h2>
                    <span className="text-sm font-normal text-[var(--text-primary)]/40">
                        {tasks.length - incompleteTasks.length}/{tasks.length}
                    </span>
                </div>
                <div className="h-px flex-1 bg-[var(--text-primary)]/10 mx-4" />

                {/* Finish Time Display */}
                {totalRemainingPomodoros > 0 && (
                    <div className="text-xs text-[var(--text-primary)]/30 font-mono whitespace-nowrap">
                        Est. {calculatedTimeStr}
                    </div>
                )}
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 pt-2 px-1 pb-1">
                            <AnimatePresence mode="popLayout">
                                {tasks.map((task) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <TaskItem
                                            task={task}
                                            isActive={task.id === activeTaskId}
                                            onToggle={toggleTask}
                                            onDelete={deleteTask}
                                            onSelect={setActiveTask}
                                            onUpdateEstimate={updateTaskEstimate}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {isAdding ? (
                                <motion.form
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-[var(--bg-secondary)] border border-[var(--text-primary)]/20 rounded-xl p-4 space-y-4"
                                    onSubmit={handleSubmit}
                                >
                                    <input
                                        autoFocus
                                        type="text"
                                        name="new-task-title"
                                        placeholder="What are you working on?"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full bg-transparent text-xl text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 outline-none"
                                    />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-[var(--text-primary)]/60">Est Pomodoros</span>
                                            <input
                                                type="number"
                                                name="new-task-estimate"
                                                min="1"
                                                max="10"
                                                value={estPomodoros}
                                                onChange={(e) => setEstPomodoros(Number(e.target.value))}
                                                className="w-16 bg-[var(--text-primary)]/5 rounded-lg p-2 text-center text-[var(--text-primary)] border-none outline-none font-mono"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsAdding(false)}
                                                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)]/50 hover:text-[var(--text-primary)] transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newTitle.trim()}
                                                className="px-6 py-2 bg-[var(--text-primary)] text-[var(--bg-main)] font-bold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </motion.form>
                            ) : (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[var(--text-primary)]/10 rounded-xl text-[var(--text-primary)]/40 font-bold hover:bg-[var(--text-primary)]/5 hover:border-[var(--text-primary)]/20 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Task
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
