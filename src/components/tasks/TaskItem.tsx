
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
    onUpdateEstimate: (id: string, n: number) => void;
}

export function TaskItem({ task, isActive, onToggle, onDelete, onSelect, onUpdateEstimate }: TaskItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(task.estimatedPomodoros.toString());

    function handleCommitEdit() {
        const val = parseInt(editValue, 10);
        // Only update if valid and changed
        if (!isNaN(val) && val > 0 && val !== task.estimatedPomodoros) {
            onUpdateEstimate(task.id, val);
        } else {
            // Revert if invalid
            setEditValue(task.estimatedPomodoros.toString());
        }
        setIsEditing(false);
    }

    return (
        <div
            className={cx(
                "group relative flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 cursor-pointer",
                isActive
                    ? "bg-[var(--bg-card-overlay)] border-[var(--text-primary)]/20 shadow-lg scale-[1.02]"
                    : "bg-[var(--bg-card-overlay)]/50 border-transparent hover:bg-[var(--bg-card-overlay)] hover:border-[var(--text-primary)]/10",
                task.isComplete && "opacity-50"
            )}
            onClick={() => onSelect(task.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Active Indicator Bar */}
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-[var(--accent-primary)] rounded-r-full" />
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
                        ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--bg-main)]"
                        : "border-[var(--text-primary)]/30 hover:border-[var(--text-primary)]/50"
                )}
            >
                {task.isComplete && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            {/* Title */}
            <span
                className={cx(
                    "flex-1 font-medium text-[var(--text-primary)] transition-all",
                    task.isComplete && "line-through text-[var(--text-primary)]/40"
                )}
            >
                {task.title}
            </span>

            {/* Pomodoro Count */}
            <span className="text-[var(--text-primary)]/60 font-mono text-sm inline-flex items-center gap-1">
                {task.completedPomodoros} /
                {isEditing ? (
                    <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        value={editValue}
                        onChange={(e) => {
                            // Only allow digits
                            const v = e.target.value.replace(/\D/g, "");
                            setEditValue(v);
                        }}
                        onBlur={() => handleCommitEdit()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleCommitEdit();
                            if (e.key === "Escape") {
                                setIsEditing(false);
                                setEditValue(task.estimatedPomodoros.toString());
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-[var(--text-primary)]/50 text-[var(--text-primary)] w-[3ch] text-center outline-none p-0 mx-1"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                            setEditValue(task.estimatedPomodoros.toString());
                        }}
                        className="hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 rounded px-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-primary)]/20"
                        title="Click to edit estimate"
                    >
                        {task.estimatedPomodoros}
                    </button>
                )}
                <span className="text-lg">🍅</span>
            </span>

            {/* Delete Button (visible on hover) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                }}
                className={cx(
                    "p-2 rounded-lg text-[var(--text-primary)]/40 hover:text-red-400 hover:bg-[var(--text-primary)]/10 transition-all",
                    isHovered ? "opacity-100" : "opacity-0"
                )}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
