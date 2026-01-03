/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import SidebarTabs from "@/components/timer/SidebarTabs";

// Wrapper component to provide refs
function TestWrapper(props: Partial<React.ComponentProps<typeof SidebarTabs>>) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    return (
        <SidebarTabs
            open={true}
            tab="study"
            focusIdx={0}
            setFocusIdx={vi.fn()}
            switchTab={vi.fn()}
            onTabsKeyDown={vi.fn()}
            tabRefs={tabRefs}
            {...props}
        />
    );
}

describe("SidebarTabs", () => {
    it("renders all three tabs", () => {
        render(<TestWrapper />);

        expect(screen.getByRole("tab", { name: "Study Time" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Short Break" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Long Break" })).toBeInTheDocument();
    });

    it("marks selected tab with aria-selected", () => {
        render(<TestWrapper tab="short" />);

        expect(screen.getByRole("tab", { name: "Study Time" })).toHaveAttribute("aria-selected", "false");
        expect(screen.getByRole("tab", { name: "Short Break" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: "Long Break" })).toHaveAttribute("aria-selected", "false");
    });

    it("calls switchTab and setFocusIdx when tab is clicked", async () => {
        const user = userEvent.setup();
        const switchTab = vi.fn();
        const setFocusIdx = vi.fn();

        render(<TestWrapper switchTab={switchTab} setFocusIdx={setFocusIdx} />);

        await user.click(screen.getByRole("tab", { name: "Long Break" }));

        expect(switchTab).toHaveBeenCalledWith("long");
        expect(setFocusIdx).toHaveBeenCalledWith(2);
    });

    it("hides tabs when open is false", () => {
        render(<TestWrapper open={false} />);

        const nav = screen.getByRole("navigation", { hidden: true });
        expect(nav).toHaveAttribute("aria-hidden", "true");
        expect(nav.className).toContain("w-0");
        expect(nav.className).toContain("opacity-0");
    });

    it("shows tabs when open is true", () => {
        render(<TestWrapper open={true} />);

        const nav = screen.getByRole("navigation");
        expect(nav).toHaveAttribute("aria-hidden", "false");
        expect(nav.className).toContain("w-36");
        expect(nav.className).toContain("opacity-100");
    });

    it("sets correct tabIndex based on focusIdx and open state", () => {
        render(<TestWrapper open={true} focusIdx={1} />);

        expect(screen.getByRole("tab", { name: "Study Time" })).toHaveAttribute("tabIndex", "-1");
        expect(screen.getByRole("tab", { name: "Short Break" })).toHaveAttribute("tabIndex", "0");
        expect(screen.getByRole("tab", { name: "Long Break" })).toHaveAttribute("tabIndex", "-1");
    });

    it("all tabs have tabIndex -1 when closed", () => {
        render(<TestWrapper open={false} focusIdx={0} />);

        const tabs = screen.getAllByRole("tab", { hidden: true });
        tabs.forEach((tab) => {
            expect(tab).toHaveAttribute("tabIndex", "-1");
        });
    });

    it("forwards keyboard events via onTabsKeyDown", async () => {
        const user = userEvent.setup();
        const onTabsKeyDown = vi.fn();

        render(<TestWrapper onTabsKeyDown={onTabsKeyDown} />);

        const studyTab = screen.getByRole("tab", { name: "Study Time" });
        studyTab.focus();

        await user.keyboard("{ArrowDown}");

        expect(onTabsKeyDown).toHaveBeenCalled();
    });

    it("applies correct accent color for study tab", () => {
        render(<TestWrapper tab="study" />);

        const studyTab = screen.getByRole("tab", { name: "Study Time" });
        expect(studyTab.className).toContain("emerald");
    });

    it("applies correct accent color for break tabs", () => {
        render(<TestWrapper tab="short" />);

        const shortTab = screen.getByRole("tab", { name: "Short Break" });
        expect(shortTab.className).toContain("sky");
    });

    it("has proper accessibility attributes", () => {
        render(<TestWrapper />);

        const nav = screen.getByRole("navigation");
        expect(nav).toHaveAttribute("aria-label", "Session modes");

        const tablist = screen.getByRole("tablist");
        expect(tablist).toHaveAttribute("aria-orientation", "vertical");

        const tabs = screen.getAllByRole("tab");
        tabs.forEach((tab) => {
            expect(tab).toHaveAttribute("aria-controls", "panel-session");
        });
    });
});
