import { describe, it, expect } from "vitest";
import { pill } from "./Pill";

describe("pill", () => {
    it("includes base pill classes", () => {
        const result = pill("focus");
        expect(result).toContain("inline-flex");
        expect(result).toContain("rounded-full");
    });

    it("includes phase accent classes for focus", () => {
        const result = pill("focus");
        expect(result).toContain("bg-emerald-500");
    });

    it("includes phase accent classes for break", () => {
        const result = pill("break");
        expect(result).toContain("bg-sky-500");
    });

    it("includes phase accent classes for danger", () => {
        const result = pill("danger");
        expect(result).toContain("bg-red-500");
    });

    it("appends extra classes", () => {
        const result = pill("focus", "custom-class", "another-class");
        expect(result).toContain("custom-class");
        expect(result).toContain("another-class");
    });

    it("filters out falsy extra classes", () => {
        const result = pill("focus", "real-class", false, null, undefined);
        expect(result).toContain("real-class");
        expect(result).not.toContain("false");
        expect(result).not.toContain("null");
        expect(result).not.toContain("undefined");
    });
});
