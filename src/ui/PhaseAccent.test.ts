import { describe, it, expect } from "vitest";
import { phaseAccent } from "./styles";

describe("phaseAccent", () => {
    it("returns danger classes for danger accent", () => {
        const result = phaseAccent("danger");
        expect(result).toContain("bg-red-500");
        expect(result).toContain("hover:bg-red-500");
        expect(result).toContain("focus-visible:ring-red-500");
    });

    it("returns the focus accent (accent-primary) classes for focus accent", () => {
        const result = phaseAccent("focus");
        expect(result).toContain("bg-[var(--accent-primary)]");
        expect(result).toContain("hover:bg-[var(--accent-primary)]");
        expect(result).toContain("focus-visible:ring-[var(--accent-primary)]");
        expect(result).toContain("text-[var(--accent-primary)]");
    });

    it("returns the break accent (accent-break) classes for break accent", () => {
        const result = phaseAccent("break");
        expect(result).toContain("bg-[var(--accent-break)]");
        expect(result).toContain("hover:bg-[var(--accent-break)]");
        expect(result).toContain("focus-visible:ring-[var(--accent-break)]");
        expect(result).toContain("text-[var(--accent-break)]");
    });
});
