import { forwardRef } from "react";
import type { Phase } from "../../ui/types";
import type { Accent } from "../../ui/types";
import { pill } from "../../ui/Pill";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    phase: Phase;
    variant?: "accent" | "danger";
};

const PillButton = forwardRef<HTMLButtonElement, Props>(
    ({ phase, variant = "accent", className, children, ...props }, ref) => {
        const accentKey: Accent = variant === "danger" ? "danger" : phase;
        return (
            <button ref={ref} {...props} className={pill(accentKey, className)}>
                {children}
            </button>
        );
    }
);

PillButton.displayName = "PillButton";

export default PillButton;