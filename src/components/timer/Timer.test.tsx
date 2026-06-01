/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Timer from "@/components/timer/Timer";
import { usePomodoroTimer } from "@/hooks/usePomodoroTimer";
import { usePersistence, PERSIST_KEY } from "@/hooks/usePersistence";
import { useSettings } from "@/hooks/useSettings";
import { DURATIONS } from "@/config/timer";
import { formatTime } from "@/lib/time";

// Timer is a controlled component that pulls in Clerk-backed premium status and
// Spotify sync. Stub those so it renders in isolation without auth/network deps.
vi.mock("@/hooks/usePremium", () => ({
    usePremium: () => ({ isPremium: false, loading: false }),
}));
vi.mock("@/hooks/useSpotifySync", () => ({
    useSpotifySync: () => ({ syncPlayback: vi.fn(), isAuthenticated: false }),
}));
// SettingsModal -> ThemeSelector -> useTheme imports server actions that pull in
// the DB layer (which throws without DATABASE_URL). Stub them; the modal is
// closed in these tests so the actions are never actually invoked.
vi.mock("@/app/actions/user", () => ({
    getPremiumStatus: vi.fn().mockResolvedValue(false),
    getUserPreferences: vi.fn().mockResolvedValue(null),
    updateUserPreferences: vi.fn().mockResolvedValue(undefined),
}));
// The Companion is a decorative dotLottie animation that needs browser APIs
// (IntersectionObserver) unavailable in jsdom and is irrelevant to Timer
// behaviour — render nothing.
vi.mock("@/components/timer/Companion", () => ({
    Companion: () => null,
}));
// useTheme pulls in Clerk + server actions; stub it with the real default config
// so any theme consumers render without a ThemeProvider.
vi.mock("@/hooks/useTheme", async () => {
    const { DEFAULT_THEME_CONFIG } = await import("@/config/themes");
    return {
        useTheme: () => ({ config: DEFAULT_THEME_CONFIG }),
        ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    };
});

// Mirrors the composition in app/page.tsx: settings + timer + persistence wired
// into the controlled Timer component.
function TimerHarness() {
    const { settings, updateSettings } = useSettings();
    const timer = usePomodoroTimer({ settings });
    usePersistence(
        {
            tab: timer.tab,
            secondsLeft: timer.secondsLeft,
            isRunning: timer.isRunning,
            completedStudies: timer.completedStudies,
            switchTab: timer.switchTab,
            setSeconds: timer.setSeconds,
            start: timer.start,
            pause: timer.pause,
        },
        PERSIST_KEY
    );
    return <Timer timer={timer} settings={settings} updateSettings={updateSettings} />;
}

describe("Timer", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders initial state correctly", () => {
        render(<TimerHarness />);

        // Should show the status chip with "Study Time — Paused"
        expect(screen.getByText(/Study Time — Paused/)).toBeInTheDocument();
        // Should show default study duration (25:00)
        expect(screen.getByText(formatTime(DURATIONS.study))).toBeInTheDocument();
    });

    it("renders Start and Reset buttons", () => {
        render(<TimerHarness />);

        expect(screen.getByRole("button", { name: /Start/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
    });

    it("toggles sidebar menu when hamburger is clicked", async () => {
        const user = userEvent.setup();
        render(<TimerHarness />);

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
        render(<TimerHarness />);

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
        render(<TimerHarness />);

        // Start the timer
        await user.click(screen.getByRole("button", { name: /Start/i }));

        // Should now show Pause button
        expect(screen.getByRole("button", { name: /Pause/i })).toBeInTheDocument();
    });

    it("disables Reset button in the pristine (fresh, untouched) state", () => {
        render(<TimerHarness />);

        const resetBtn = screen.getByRole("button", { name: /Reset/i });
        expect(resetBtn).toBeDisabled();
    });

    it("enables Reset once the timer has started (progress to clear)", async () => {
        const user = userEvent.setup();
        render(<TimerHarness />);

        await user.click(screen.getByRole("button", { name: /Start/i }));

        expect(screen.getByRole("button", { name: /Reset/i })).toBeEnabled();
    });

    it("has accessible hamburger toggle button", () => {
        render(<TimerHarness />);

        const toggleBtn = screen.getByRole("button", { name: /Toggle session menu/i });
        expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
        expect(toggleBtn).toHaveAttribute("aria-controls", "sidebar-tabs");
    });

    it("persists timer state to localStorage after starting", async () => {
        const user = userEvent.setup();
        render(<TimerHarness />);

        // Start the timer
        await user.click(screen.getByRole("button", { name: /Start/i }));

        // Check localStorage has been updated
        const saved = localStorage.getItem(PERSIST_KEY);
        expect(saved).toBeTruthy();

        const parsed = JSON.parse(saved!);
        expect(parsed.tab).toBe("study");
        expect(parsed.running).toBe(true);
    });
});
