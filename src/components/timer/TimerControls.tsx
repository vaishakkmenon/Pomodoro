import PillButton from "@/components/ui/PillButton";
import type { Phase } from "@/ui/types";

type Props = {
    phase: Phase;
    isRunning: boolean;
    startDisabled: boolean;
    resetDisabled: boolean;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onPrimeAudio: () => void;
    startBtnRef: React.RefObject<HTMLButtonElement | null>;
    resetBtnRef: React.RefObject<HTMLButtonElement | null>;
};

/**
 * Timer control buttons (Start/Pause and Reset).
 */
export default function TimerControls({
    phase,
    isRunning,
    startDisabled,
    resetDisabled,
    onStart,
    onPause,
    onReset,
    onPrimeAudio,
    startBtnRef,
    resetBtnRef,
}: Props) {
    return (
        <div className="flex justify-center gap-3">
            <PillButton
                ref={startBtnRef}
                type="button"
                phase={phase}
                onClick={() => {
                    onPrimeAudio();
                    isRunning ? onPause() : onStart();
                }}
                aria-pressed={isRunning}
                className="min-w-28 justify-center !text-lg !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={startDisabled}
            >
                {isRunning ? "Pause" : "Start"}
            </PillButton>

            <PillButton
                ref={resetBtnRef}
                type="button"
                phase={phase}
                variant="danger"
                onClick={onReset}
                className="min-w-28 justify-center !text-lg !px-4 !py-2"
                disabled={resetDisabled}
                title={resetDisabled ? "Already reset" : "Reset timer"}
            >
                Reset
            </PillButton>
        </div>
    );
}
