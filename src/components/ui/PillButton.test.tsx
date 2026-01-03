/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PillButton from "@/components/ui/PillButton";

describe("PillButton", () => {
    it("renders children correctly", () => {
        render(<PillButton phase="focus">Click me</PillButton>);

        expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("applies focus phase accent styling", () => {
        render(<PillButton phase="focus">Focus Button</PillButton>);

        const button = screen.getByRole("button");
        // Check that it has some focus-related class
        expect(button.className).toContain("emerald");
    });

    it("applies break phase accent styling", () => {
        render(<PillButton phase="break">Break Button</PillButton>);

        const button = screen.getByRole("button");
        // Check that it has break-related class
        expect(button.className).toContain("sky");
    });

    it("applies danger variant styling", () => {
        render(<PillButton phase="focus" variant="danger">Danger</PillButton>);

        const button = screen.getByRole("button");
        expect(button.className).toContain("red");
    });

    it("defaults to accent variant", () => {
        render(<PillButton phase="focus">Default</PillButton>);

        const button = screen.getByRole("button");
        // Should not have danger/red styling
        expect(button.className).not.toContain("red");
    });

    it("forwards ref correctly", () => {
        const ref = { current: null as HTMLButtonElement | null };
        render(<PillButton ref={ref} phase="focus">With Ref</PillButton>);

        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
        expect(ref.current?.textContent).toBe("With Ref");
    });

    it("passes through native button props", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(
            <PillButton
                phase="focus"
                onClick={onClick}
                disabled
                type="submit"
                aria-label="Submit form"
            >
                Submit
            </PillButton>
        );

        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("type", "submit");
        expect(button).toHaveAttribute("aria-label", "Submit form");

        await user.click(button);
        expect(onClick).not.toHaveBeenCalled(); // disabled
    });

    it("merges custom className with pill styles", () => {
        render(<PillButton phase="focus" className="my-custom-class">Custom</PillButton>);

        const button = screen.getByRole("button");
        expect(button.className).toContain("my-custom-class");
    });

    it("has displayName for debugging", () => {
        expect(PillButton.displayName).toBe("PillButton");
    });
});
