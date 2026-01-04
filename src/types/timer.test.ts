import { describe, it, expect } from "vitest";
import { isValidSavedState, isValidCatchupState } from "./timer";

describe("isValidSavedState", () => {
    it("returns false for null", () => {
        expect(isValidSavedState(null)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(isValidSavedState(undefined)).toBe(false);
    });

    it("returns false for non-objects", () => {
        expect(isValidSavedState("string")).toBe(false);
        expect(isValidSavedState(123)).toBe(false);
        expect(isValidSavedState(true)).toBe(false);
        expect(isValidSavedState([])).toBe(false);
    });

    it("returns false when missing required fields", () => {
        expect(isValidSavedState({})).toBe(false);
        expect(isValidSavedState({ tab: "study" })).toBe(false);
        expect(isValidSavedState({ tab: "study", seconds: 100 })).toBe(false);
        expect(isValidSavedState({ seconds: 100, running: true })).toBe(false);
    });

    it("returns false when fields have wrong types", () => {
        expect(isValidSavedState({ tab: 123, seconds: 100, running: true })).toBe(false);
        expect(isValidSavedState({ tab: "study", seconds: "100", running: true })).toBe(false);
        expect(isValidSavedState({ tab: "study", seconds: 100, running: "true" })).toBe(false);
    });

    it("returns true for valid minimal state", () => {
        expect(isValidSavedState({ tab: "study", seconds: 100, running: true })).toBe(true);
        expect(isValidSavedState({ tab: "short", seconds: 0, running: false })).toBe(true);
        expect(isValidSavedState({ tab: "long", seconds: 999, running: true })).toBe(true);
    });

    it("returns true for valid state with optional fields", () => {
        expect(isValidSavedState({
            tab: "study",
            seconds: 1500,
            running: true,
            completedStudies: 3,
            savedAt: Date.now(),
        })).toBe(true);
    });

    it("returns true even with extra fields (forwards compatibility)", () => {
        expect(isValidSavedState({
            tab: "study",
            seconds: 100,
            running: true,
            unknownField: "value",
        })).toBe(true);
    });
});

describe("isValidCatchupState", () => {
    it("returns false for null", () => {
        expect(isValidCatchupState(null)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(isValidCatchupState(undefined)).toBe(false);
    });

    it("returns false for non-objects", () => {
        expect(isValidCatchupState("string")).toBe(false);
        expect(isValidCatchupState(123)).toBe(false);
        expect(isValidCatchupState([])).toBe(false);
    });

    it("returns false when missing required fields", () => {
        expect(isValidCatchupState({})).toBe(false);
        expect(isValidCatchupState({ running: true })).toBe(false);
        expect(isValidCatchupState({ savedAt: 1234567890 })).toBe(false);
    });

    it("returns false when fields have wrong types", () => {
        expect(isValidCatchupState({ running: "true", savedAt: 1234567890 })).toBe(false);
        expect(isValidCatchupState({ running: true, savedAt: "1234567890" })).toBe(false);
    });

    it("returns true for valid catchup state", () => {
        expect(isValidCatchupState({ running: true, savedAt: 1234567890 })).toBe(true);
        expect(isValidCatchupState({ running: false, savedAt: Date.now() })).toBe(true);
    });

    it("returns true even with extra fields", () => {
        expect(isValidCatchupState({
            running: true,
            savedAt: 1234567890,
            tab: "study",
            seconds: 100,
        })).toBe(true);
    });
});
