import { cx } from "@/ui/cx";
import { TABS, LABELS, type Tab } from "@/config/timer";
import { useMemo } from "react";

type Props = {
    open: boolean;
    tab: Tab;
    focusIdx: number;
    setFocusIdx: (i: number) => void;
    switchTab: (t: Tab) => void;
    onTabsKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
    tabRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
};

const ITEM_H = 40; // matches h-10
const GAP = 8;     // matches gap-2

export default function SidebarTabs({
    open,
    tab,
    focusIdx,
    setFocusIdx,
    switchTab,
    onTabsKeyDown,
    tabRefs,
}: Props) {
    const translate = useMemo(
        () => `translateY(${TABS.indexOf(tab) * (ITEM_H + GAP)}px)`,
        [tab]
    );

    return (
        <nav
            id="sidebar-tabs"
            aria-label="Session modes"
            aria-hidden={!open}
            className={cx(
                "self-stretch overflow-hidden",
                "transition-[width,opacity] duration-700 ease-in-out motion-reduce:transition-none",
                open ? "w-36 opacity-100" : "w-0 opacity-0 pointer-events-none"
            )}
        >
            <div className="w-36 flex-none">
                <div
                    role="tablist"
                    aria-orientation="vertical"
                    onKeyDown={onTabsKeyDown}
                    className="relative rounded-2xl"
                >
                    {/* Outline thumb — matches wrapper exactly */}
                    {/* Outline thumb — matches wrapper exactly */}
                    <div
                        aria-hidden
                        className={cx(
                            "pointer-events-none absolute left-[3px] right-[3px] top-0 rounded-full box-border",
                            "border transition-transform duration-300 ease-out",
                            tab === "study"
                                ? "border-[var(--accent-primary)] border-opacity-40"
                                : "border-[var(--accent-break)] border-opacity-40"
                        )}
                        style={{ height: ITEM_H, transform: translate }}
                    />

                    {/* Buttons */}
                    <div className="relative z-10 flex flex-col gap-2">
                        {TABS.map((key, idx) => {
                            const tabId = `tab-${key}`;
                            const selected = tab === key;
                            const focused = focusIdx === idx;
                            const isStudy = key === "study";
                            return (
                                <div key={key} className="relative rounded-full px-[3px] overflow-hidden">
                                    <button
                                        id={tabId}
                                        role="tab"
                                        aria-selected={selected}
                                        aria-controls="panel-session"
                                        tabIndex={open && focused ? 0 : -1}
                                        ref={(el) => { tabRefs.current[idx] = el; }}
                                        type="button"
                                        onClick={() => { switchTab(key); setFocusIdx(idx); }}
                                        className={cx(
                                            "relative inline-flex w-full items-center justify-center text-center",
                                            "h-10 px-4 whitespace-nowrap rounded-[inherit]",
                                            selected ? (isStudy ? "bg-[var(--accent-primary)]/10" : "bg-[var(--accent-break)]/10") : "bg-transparent",
                                            "text-white/80 hover:text-white transition-colors",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ring-inset",
                                            selected && "text-white"
                                        )}
                                    >
                                        <span className="truncate">{LABELS[key]}</span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}