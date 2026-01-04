import { describe, it, expect } from "vitest";
import { phaseAccent } from "./PhaseAccent";

describe("phaseAccent", () => {
    it("returns danger classes for danger accent", () => {
        const result = phaseAccent("danger");
        expect(result).toContain("bg-red-500");
        expect(result).toContain("hover:bg-red-500");
        expect(result).toContain("focus-visible:ring-red-500");
    });

    it("returns focus/emerald classes for focus accent", () => {
        const result = phaseAccent("focus");
        expect(result).toContain("bg-emerald-500");
        expect(result).toContain("hover:bg-emerald-400");
        expect(result).toContain("focus-visible:ring-emerald-400");
    });

    it("returns break/sky classes for break accent", () => {
        const result = phaseAccent("break");
        expect(result).toContain("bg-sky-500");
        expect(result).toContain("hover:bg-sky-400");
        expect(result).toContain("focus-visible:ring-sky-400");
    });
});
