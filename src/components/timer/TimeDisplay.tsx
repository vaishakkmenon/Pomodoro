import { useState } from "react";
import { cx } from "@/ui/cx";
import { formatTime, parseFlexibleTime, sanitizeTimeInput } from "@/lib/time";

type Props = {
    secondsLeft: number;
    onTimeChange: (seconds: number) => void;
    onPause: () => void;
};

/**
 * Displays the timer countdown with click-to-edit functionality.
 * Supports flexible time input formats (MM:SS, MMSS, or just MM).
 */
export default function TimeDisplay({ secondsLeft, onTimeChange, onPause }: Props) {
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState("");
    const [inputError, setInputError] = useState(false);

    function startEditing() {
        setInput(formatTime(secondsLeft));
        setInputError(false);
        setEditing(true);
    }

    function commitEdit() {
        const total = parseFlexibleTime(input);
        if (total == null) {
            setInputError(true);
            return;
        }
        setInputError(false);
        onPause();
        onTimeChange(total);
        setEditing(false);
    }

    function cancelEdit() {
        setEditing(false);
    }

    if (!editing) {
        return (
            <button
                type="button"
                onClick={startEditing}
                className="inline-block min-w-[6ch] text-center align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 rounded"
                title="Click to edit time (MM:SS). You can also type 2530 → 25:30 or 30 → 30:00"
            >
                {formatTime(secondsLeft)}
            </button>
        );
    }

    return (
        <input
            autoFocus
            value={input}
            onChange={(e) => {
                const v = sanitizeTimeInput(e.target.value);
                setInput(v);
                setInputError(parseFlexibleTime(v) == null);
            }}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commitEdit}
            onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                else if (e.key === "Escape") cancelEdit();
            }}
            className={cx(
                "inline-block w-[6ch] text-center bg-transparent border-b outline-none caret-white align-middle",
                inputError ? "border-red-400 focus:border-red-400" : "border-white/20 focus:border-white/40"
            )}
            inputMode="numeric"
            aria-label="Edit timer (MM:SS or digits like 2530)"
            placeholder="MM:SS"
        />
    );
}
