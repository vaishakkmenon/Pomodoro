import { formatTime } from "@/lib/time";

type Props = {
    elapsedSeconds: number;
    onApply: () => void;
    onDismiss: () => void;
};

/**
 * Toast notification shown when user returns after being away.
 * Offers to apply catch-up time to the timer.
 */
export default function CatchupToast({ elapsedSeconds, onApply, onDismiss }: Props) {
    return (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
            <div className="rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-3 shadow-lg backdrop-blur">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-white">
                        You were away for <span className="font-semibold">{formatTime(elapsedSeconds)}</span>. Apply catch-up?
                    </span>
                    <div className="flex gap-2">
                        <button
                            className="rounded-md bg-emerald-600/90 px-3 py-1.5 text-sm text-white hover:bg-emerald-600"
                            onClick={onApply}
                        >
                            Apply
                        </button>
                        <button
                            className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                            onClick={onDismiss}
                        >
                            Keep time
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
