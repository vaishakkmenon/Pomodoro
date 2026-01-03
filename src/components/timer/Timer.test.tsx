/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Timer from "@/components/timer/Timer";
import { DURATIONS } from "@/config/timer";
import { formatTime } from "@/lib/time";

// Mock useChime to avoid audio issues in tests
vi.mock("@/hooks/useChime", () => ({
    useChime: () => ({
        play: vi.fn(),
        prime: vi.fn(),
        elementRef: { current: null },
    }),
}));

describe("Timer", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders initial state correctly", () => {
        render(<Timer />);

        // Should show the status chip with "Study Time — Paused"
        expect(screen.getByText(/Study Time — Paused/)).toBeInTheDocument();
        // Should show default study duration (25:00)
        expect(screen.getByText(formatTime(DURATIONS.study))).toBeInTheDocument();
    });

    it("renders Start and Reset buttons", () => {
        render(<Timer />);

        expect(screen.getByRole("button", { name: /Start/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
    });

    it("toggles sidebar menu when hamburger is clicked", async () => {
        const user = userEvent.setup();
        render(<Timer />);

        const toggleBtn = screen.getByTitle(/Show session tabs/i);
        expect(toggleBtn).toBeInTheDocument();

        await user.click(toggleBtn);

        // Now should show tabs (they become visible)
        expect(screen.getByRole("tab", { name: "Study Time" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Short Break" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Long Break" })).toBeInTheDocument();
    });

    it("switches tab when clicking tab buttons", async () => {
        const user = userEvent.setup();
        render(<Timer />);

        // Open the sidebar first
        const toggleBtn = screen.getByTitle(/Show session tabs/i);
        await user.click(toggleBtn);

        // Click Short Break tab
        await user.click(screen.getByRole("tab", { name: "Short Break" }));

        // Should show Short Break in status chip and its duration
        expect(screen.getByText(/Short Break — Paused/)).toBeInTheDocument();
        expect(screen.getByText(formatTime(DURATIONS.short))).toBeInTheDocument();
    });

    it("shows Pause button when timer is running", async () => {
        const user = userEvent.setup();
        render(<Timer />);

        // Start the timer
        await user.click(screen.getByRole("button", { name: /Start/i }));

        // Should now show Pause button
        expect(screen.getByRole("button", { name: /Pause/i })).toBeInTheDocument();
    });

    it("disables Reset button when at full duration", () => {
        render(<Timer />);

        const resetBtn = screen.getByRole("button", { name: /Reset/i });
        expect(resetBtn).toBeDisabled();
    });

    it("has accessible hamburger toggle button", () => {
        render(<Timer />);

        const toggleBtn = screen.getByRole("button", { name: /Toggle session menu/i });
        expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
        expect(toggleBtn).toHaveAttribute("aria-controls", "sidebar-tabs");
    });

    it("persists timer state to localStorage after starting", async () => {
        const user = userEvent.setup();
        render(<Timer />);

        // Start the timer
        await user.click(screen.getByRole("button", { name: /Start/i }));

        // Check localStorage has been updated
        const saved = localStorage.getItem("pomodoro:v1");
        expect(saved).toBeTruthy();

        const parsed = JSON.parse(saved!);
        expect(parsed.tab).toBe("study");
        expect(parsed.running).toBe(true);
    });
});
