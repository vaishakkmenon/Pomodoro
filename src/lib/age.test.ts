import { describe, it, expect } from "vitest";
import { getAge, MINIMUM_AGE } from "./age";

describe("getAge", () => {
    const now = new Date("2026-05-31");

    it("computes age for a birthday that has already passed this year", () => {
        expect(getAge(new Date("2000-01-15"), now)).toBe(26);
    });

    it("does not count a birthday that hasn't occurred yet this year", () => {
        expect(getAge(new Date("2000-12-15"), now)).toBe(25);
    });

    it("counts the birthday on the exact day", () => {
        expect(getAge(new Date("2010-05-31"), now)).toBe(16);
    });

    it("returns just under the minimum for someone whose 16th birthday is tomorrow", () => {
        // Born 2010-06-01 -> on 2026-05-31 they are still 15.
        const birth = new Date("2010-06-01");
        expect(getAge(birth, now)).toBe(15);
        expect(getAge(birth, now) < MINIMUM_AGE).toBe(true);
    });

    it("returns exactly the minimum for someone whose 16th birthday is today", () => {
        const birth = new Date("2010-05-31");
        expect(getAge(birth, now)).toBe(MINIMUM_AGE);
        expect(getAge(birth, now) < MINIMUM_AGE).toBe(false);
    });
});
