import { describe, it, expect } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
    it("joins multiple class strings", () => {
        expect(cx("foo", "bar", "baz")).toBe("foo bar baz");
    });

    it("filters out falsy values", () => {
        expect(cx("foo", false, "bar", null, "baz", undefined)).toBe("foo bar baz");
    });

    it("returns empty string for no arguments", () => {
        expect(cx()).toBe("");
    });

    it("returns empty string for all falsy arguments", () => {
        expect(cx(false, null, undefined)).toBe("");
    });

    it("handles single class", () => {
        expect(cx("foo")).toBe("foo");
    });

    it("handles conditional classes", () => {
        const isActive = true;
        const isDisabled = false;
        expect(cx("base", isActive && "active", isDisabled && "disabled")).toBe("base active");
    });
});
