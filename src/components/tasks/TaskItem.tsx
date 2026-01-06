
import { Task } from "@/types/task";
import { Check, Trash2 } from "lucide-react";
import { cx } from "@/ui/cx";
import { useState } from "react";

interface TaskItemProps {
    task: Task;
    isActive: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

export function TaskItem({ task, isActive, onToggle, onDelete, onSelect }: TaskItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={cx(
                "group relative flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 cursor-pointer",
                isActive
                    ? "bg-white/10 border-white/20 shadow-lg scale-[1.02]"
                    : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10",
                task.isComplete && "opacity-50"
            )}
            onClick={() => onSelect(task.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Active Indicator Bar */}
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-white rounded-r-full" />
            )}

            {/* Checkbox */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(task.id);
                }}
                className={cx(
                    "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                    task.isComplete
                        ? "bg-emerald-500 border-emerald-500 text-black"
                        : "border-white/30 hover:border-white/50"
                )}
            >
                {task.isComplete && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            {/* Title */}
            <span
                className={cx(
                    "flex-1 font-medium text-white transition-all",
                    task.isComplete && "line-through text-white/40"
                )}
            >
                {task.title}
            </span>

            {/* Pomodoro Count */}
            <div className="flex items-center gap-4">
                <span className="text-white/60 font-mono text-sm">
                    {task.completedPomodoros}/{task.estimatedPomodoros} <span className="text-lg">🍅</span>
                </span>

                {/* Delete Button (visible on hover) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                    }}
                    className={cx(
                        "p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 transition-all",
                        isHovered ? "opacity-100" : "opacity-0"
                    )}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
