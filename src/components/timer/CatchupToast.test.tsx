import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatchupToast from "./CatchupToast";

describe("CatchupToast", () => {
    it("renders with formatted elapsed time", () => {
        render(
            <CatchupToast
                elapsedSeconds={125}
                onApply={() => {}}
                onDismiss={() => {}}
            />
        );

        expect(screen.getByText("02:05")).toBeInTheDocument();
        expect(screen.getByText(/You were away for/)).toBeInTheDocument();
    });

    it("has role='alert' for accessibility", () => {
        render(
            <CatchupToast
                elapsedSeconds={60}
                onApply={() => {}}
                onDismiss={() => {}}
            />
        );

        expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("calls onApply when Apply button is clicked", async () => {
        const user = userEvent.setup();
        const onApply = vi.fn();

        render(
            <CatchupToast
                elapsedSeconds={60}
                onApply={onApply}
                onDismiss={() => {}}
            />
        );

        await user.click(screen.getByRole("button", { name: "Apply" }));
        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it("calls onDismiss when Keep time button is clicked", async () => {
        const user = userEvent.setup();
        const onDismiss = vi.fn();

        render(
            <CatchupToast
                elapsedSeconds={60}
                onApply={() => {}}
                onDismiss={onDismiss}
            />
        );

        await user.click(screen.getByRole("button", { name: "Keep time" }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("renders both buttons", () => {
        render(
            <CatchupToast
                elapsedSeconds={300}
                onApply={() => {}}
                onDismiss={() => {}}
            />
        );

        expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Keep time" })).toBeInTheDocument();
    });
});
