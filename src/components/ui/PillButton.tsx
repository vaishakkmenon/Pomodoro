import type { Phase } from "../../ui/types";
import { pillBase } from "../../ui/PillBase";
import { phaseAccent, phaseDanger } from "../../ui/PhaseAccent";
import { cx } from "../../ui/cx";

type PillVariant = "accent" | "danger";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    phase: Phase;
    variant?: PillVariant;
};

export default function PillButton({
    phase,
    variant = "accent",
    className,
    children,
    ...props
}: Props) {
    const classes =
        variant === "danger"
            ? cx(pillBase, phaseDanger(phase), className)
            : cx(pillBase, phaseAccent(phase), className);

    return (
        <button {...props} className={classes}>
            {children}
        </button>
    );
}