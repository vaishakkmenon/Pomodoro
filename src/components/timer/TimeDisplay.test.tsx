import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeDisplay from "./TimeDisplay";

describe("TimeDisplay", () => {
    it("displays formatted time initially", () => {
        render(
            <TimeDisplay
                secondsLeft={1530}
                onTimeChange={() => {}}
                onPause={() => {}}
            />
        );

        expect(screen.getByRole("button", { name: "25:30" })).toBeInTheDocument();
    });

    it("enters edit mode when clicked", async () => {
        const user = userEvent.setup();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={() => {}}
                onPause={() => {}}
            />
        );

        await user.click(screen.getByRole("button", { name: "25:00" }));

        // Should now show an input instead of button
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.getByRole("textbox")).toBeInTheDocument();
        expect(screen.getByRole("textbox")).toHaveValue("25:00");
    });

    it("commits valid input on Enter", async () => {
        const user = userEvent.setup();
        const onTimeChange = vi.fn();
        const onPause = vi.fn();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={onTimeChange}
                onPause={onPause}
            />
        );

        await user.click(screen.getByRole("button", { name: "25:00" }));
        await user.clear(screen.getByRole("textbox"));
        await user.type(screen.getByRole("textbox"), "30:00{Enter}");

        expect(onPause).toHaveBeenCalledTimes(1);
        expect(onTimeChange).toHaveBeenCalledWith(1800); // 30 minutes
    });

    it("commits valid input on blur", async () => {
        const user = userEvent.setup();
        const onTimeChange = vi.fn();
        const onPause = vi.fn();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={onTimeChange}
                onPause={onPause}
            />
        );

        await user.click(screen.getByRole("button", { name: "25:00" }));
        await user.clear(screen.getByRole("textbox"));
        await user.type(screen.getByRole("textbox"), "10:30");
        await user.tab(); // blur

        expect(onPause).toHaveBeenCalledTimes(1);
        expect(onTimeChange).toHaveBeenCalledWith(630); // 10:30
    });

    it("cancels edit on Escape", async () => {
        const user = userEvent.setup();
        const onTimeChange = vi.fn();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={onTimeChange}
                onPause={() => {}}
            />
        );

        await user.click(screen.getByRole("button", { name: "25:00" }));
        await user.type(screen.getByRole("textbox"), "99:99{Escape}");

        // Should return to button mode without calling onTimeChange
        expect(screen.getByRole("button", { name: "25:00" })).toBeInTheDocument();
        expect(onTimeChange).not.toHaveBeenCalled();
    });

    it("does not commit invalid input", async () => {
        const user = userEvent.setup();
        const onTimeChange = vi.fn();
        const onPause = vi.fn();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={onTimeChange}
                onPause={onPause}
            />
        );

        await user.click(screen.getByRole("button", { name: "25:00" }));
        await user.clear(screen.getByRole("textbox"));
        await user.type(screen.getByRole("textbox"), "99:99{Enter}");

        // Should stay in edit mode and not call handlers
        expect(screen.getByRole("textbox")).toBeInTheDocument();
        expect(onTimeChange).not.toHaveBeenCalled();
        expect(onPause).not.toHaveBeenCalled();
    });

    it("sanitizes input to only allow digits and colon", async () => {
        const user = userEvent.setup();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={() => {}}
                onPause={() => {}}
            />
        );

        await user.click(screen.getByRole("button", { name: "25:00" }));
        await user.clear(screen.getByRole("textbox"));
        await user.type(screen.getByRole("textbox"), "12abc:34xyz");

        expect(screen.getByRole("textbox")).toHaveValue("12:34");
    });

    it("accepts flexible time formats", async () => {
        const user = userEvent.setup();
        const onTimeChange = vi.fn();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={onTimeChange}
                onPause={() => {}}
            />
        );

        // Test "2530" → 25:30
        await user.click(screen.getByRole("button", { name: "25:00" }));
        await user.clear(screen.getByRole("textbox"));
        await user.type(screen.getByRole("textbox"), "2530{Enter}");

        expect(onTimeChange).toHaveBeenCalledWith(1530); // 25:30
    });

    it("has accessible input label", async () => {
        const user = userEvent.setup();

        render(
            <TimeDisplay
                secondsLeft={1500}
                onTimeChange={() => {}}
                onPause={() => {}}
            />
        );

        await user.click(screen.getByRole("button", { name: "25:00" }));

        expect(screen.getByLabelText(/Edit timer/)).toBeInTheDocument();
    });
});
