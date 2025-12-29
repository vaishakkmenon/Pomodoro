import { describe, it, expect } from "vitest";
import { formatTime, parseFlexibleTime, sanitizeTimeInput } from "@/lib/time";

describe("formatTime", () => {
    it("formats zero seconds", () => {
        expect(formatTime(0)).toBe("00:00");
    });

    it("formats seconds only (under a minute)", () => {
        expect(formatTime(5)).toBe("00:05");
        expect(formatTime(30)).toBe("00:30");
        expect(formatTime(59)).toBe("00:59");
    });

    it("formats minutes and seconds", () => {
        expect(formatTime(60)).toBe("01:00");
        expect(formatTime(90)).toBe("01:30");
        expect(formatTime(125)).toBe("02:05");
    });

    it("formats standard pomodoro durations", () => {
        expect(formatTime(25 * 60)).toBe("25:00"); // 25 min study
        expect(formatTime(5 * 60)).toBe("05:00");  // 5 min short break
        expect(formatTime(15 * 60)).toBe("15:00"); // 15 min long break
    });

    it("formats large values (over an hour)", () => {
        expect(formatTime(60 * 60)).toBe("60:00");        // 1 hour
        expect(formatTime(90 * 60)).toBe("90:00");        // 1.5 hours
        expect(formatTime(100 * 60 + 30)).toBe("100:30"); // 100 min 30 sec
    });

    it("pads single-digit minutes and seconds", () => {
        expect(formatTime(65)).toBe("01:05");
        expect(formatTime(9)).toBe("00:09");
    });
});

describe("parseFlexibleTime", () => {
    describe("MM:SS format", () => {
        it("parses standard time format", () => {
            expect(parseFlexibleTime("25:00")).toBe(25 * 60);
            expect(parseFlexibleTime("05:30")).toBe(5 * 60 + 30);
            expect(parseFlexibleTime("0:45")).toBe(45);
        });

        it("parses with leading/trailing whitespace", () => {
            expect(parseFlexibleTime("  25:00  ")).toBe(25 * 60);
        });

        it("parses large minute values", () => {
            expect(parseFlexibleTime("100:30")).toBe(100 * 60 + 30);
            expect(parseFlexibleTime("999:59")).toBe(999 * 60 + 59);
        });

        it("rejects invalid seconds (>= 60)", () => {
            expect(parseFlexibleTime("25:60")).toBeNull();
            expect(parseFlexibleTime("25:99")).toBeNull();
        });

        it("rejects malformed colon formats", () => {
            expect(parseFlexibleTime(":30")).toBeNull();
            expect(parseFlexibleTime("25:")).toBeNull();
            expect(parseFlexibleTime("25:1a")).toBeNull();
            expect(parseFlexibleTime("ab:30")).toBeNull();
        });
    });

    describe("digits-only format", () => {
        it("treats 1-2 digits as minutes", () => {
            expect(parseFlexibleTime("5")).toBe(5 * 60);
            expect(parseFlexibleTime("25")).toBe(25 * 60);
            expect(parseFlexibleTime("0")).toBe(0);
        });

        it("treats 3+ digits as MMSS", () => {
            expect(parseFlexibleTime("530")).toBe(5 * 60 + 30);   // 5:30
            expect(parseFlexibleTime("2530")).toBe(25 * 60 + 30); // 25:30
            expect(parseFlexibleTime("10030")).toBe(100 * 60 + 30); // 100:30
        });

        it("rejects invalid seconds in digit format", () => {
            expect(parseFlexibleTime("2560")).toBeNull(); // 25:60 invalid
            expect(parseFlexibleTime("199")).toBeNull();  // 1:99 invalid
        });
    });

    describe("edge cases", () => {
        it("returns null for empty string", () => {
            expect(parseFlexibleTime("")).toBeNull();
            expect(parseFlexibleTime("   ")).toBeNull();
        });

        it("returns null for non-numeric input", () => {
            expect(parseFlexibleTime("abc")).toBeNull();
            expect(parseFlexibleTime("12a34")).toBeNull();
        });

        it("handles zero correctly", () => {
            expect(parseFlexibleTime("0")).toBe(0);
            expect(parseFlexibleTime("00")).toBe(0);
            expect(parseFlexibleTime("0:00")).toBe(0);
            expect(parseFlexibleTime("00:00")).toBe(0);
        });
    });
});

describe("sanitizeTimeInput", () => {
    it("allows digits", () => {
        expect(sanitizeTimeInput("12345")).toBe("12345");
    });

    it("allows single colon", () => {
        expect(sanitizeTimeInput("25:30")).toBe("25:30");
    });

    it("removes multiple colons (keeps first)", () => {
        expect(sanitizeTimeInput("25:30:45")).toBe("25:3045");
        expect(sanitizeTimeInput("::30")).toBe(":30");
    });

    it("removes non-digit, non-colon characters", () => {
        expect(sanitizeTimeInput("25a30")).toBe("2530");
        expect(sanitizeTimeInput("25 : 30")).toBe("25:30");
        expect(sanitizeTimeInput("ab:cd")).toBe(":");
    });

    it("handles empty string", () => {
        expect(sanitizeTimeInput("")).toBe("");
    });
});
