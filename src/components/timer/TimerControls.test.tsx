import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import TimerControls from "./TimerControls";

const defaultProps = {
    phase: "focus" as const,
    isRunning: false,
    startDisabled: false,
    resetDisabled: false,
    onStart: vi.fn(),
    onPause: vi.fn(),
    onReset: vi.fn(),
    onPrimeAudio: vi.fn(),
    startBtnRef: createRef<HTMLButtonElement>(),
    resetBtnRef: createRef<HTMLButtonElement>(),
};

describe("TimerControls", () => {
    it("shows Start button when not running", () => {
        render(<TimerControls {...defaultProps} isRunning={false} />);

        expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    });

    it("shows Pause button when running", () => {
        render(<TimerControls {...defaultProps} isRunning={true} />);

        expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    });

    it("calls onStart and primes audio when Start is clicked", async () => {
        const user = userEvent.setup();
        const onStart = vi.fn();
        const onPrimeAudio = vi.fn();

        render(
            <TimerControls
                {...defaultProps}
                isRunning={false}
                onStart={onStart}
                onPrimeAudio={onPrimeAudio}
            />
        );

        await user.click(screen.getByRole("button", { name: "Start" }));

        expect(onPrimeAudio).toHaveBeenCalledTimes(1);
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("calls onPause and primes audio when Pause is clicked", async () => {
        const user = userEvent.setup();
        const onPause = vi.fn();
        const onPrimeAudio = vi.fn();

        render(
            <TimerControls
                {...defaultProps}
                isRunning={true}
                onPause={onPause}
                onPrimeAudio={onPrimeAudio}
            />
        );

        await user.click(screen.getByRole("button", { name: "Pause" }));

        expect(onPrimeAudio).toHaveBeenCalledTimes(1);
        expect(onPause).toHaveBeenCalledTimes(1);
    });

    it("calls onReset when Reset is clicked", async () => {
        const user = userEvent.setup();
        const onReset = vi.fn();

        render(<TimerControls {...defaultProps} onReset={onReset} />);

        await user.click(screen.getByRole("button", { name: "Reset" }));

        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it("disables Start button when startDisabled is true", () => {
        render(<TimerControls {...defaultProps} startDisabled={true} />);

        expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    });

    it("disables Reset button when resetDisabled is true", () => {
        render(<TimerControls {...defaultProps} resetDisabled={true} />);

        expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
    });

    it("has aria-pressed reflecting running state", () => {
        const { rerender } = render(
            <TimerControls {...defaultProps} isRunning={false} />
        );

        expect(screen.getByRole("button", { name: "Start" })).toHaveAttribute(
            "aria-pressed",
            "false"
        );

        rerender(<TimerControls {...defaultProps} isRunning={true} />);

        expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute(
            "aria-pressed",
            "true"
        );
    });

    it("renders both Start/Pause and Reset buttons", () => {
        render(<TimerControls {...defaultProps} />);

        expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    });

    it("assigns refs to buttons", () => {
        const startRef = createRef<HTMLButtonElement>();
        const resetRef = createRef<HTMLButtonElement>();

        render(
            <TimerControls
                {...defaultProps}
                startBtnRef={startRef}
                resetBtnRef={resetRef}
            />
        );

        expect(startRef.current).toBeInstanceOf(HTMLButtonElement);
        expect(resetRef.current).toBeInstanceOf(HTMLButtonElement);
    });
});
