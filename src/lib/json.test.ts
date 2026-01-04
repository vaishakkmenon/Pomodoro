import { describe, it, expect } from "vitest";
import { safeParseJSON } from "./json";

describe("safeParseJSON", () => {
    it("returns null for null input", () => {
        expect(safeParseJSON(null)).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(safeParseJSON("")).toBeNull();
    });

    it("parses valid JSON without validator", () => {
        expect(safeParseJSON('{"a":1}')).toEqual({ a: 1 });
        expect(safeParseJSON('"hello"')).toBe("hello");
        expect(safeParseJSON("42")).toBe(42);
        expect(safeParseJSON("true")).toBe(true);
        expect(safeParseJSON("[1,2,3]")).toEqual([1, 2, 3]);
    });

    it("returns null for invalid JSON", () => {
        expect(safeParseJSON("{invalid}")).toBeNull();
        expect(safeParseJSON("undefined")).toBeNull();
        expect(safeParseJSON("{a:1}")).toBeNull(); // missing quotes
    });

    it("returns parsed value when validator passes", () => {
        const isNumber = (x: unknown): x is number => typeof x === "number";
        expect(safeParseJSON("42", isNumber)).toBe(42);
    });

    it("returns null when validator fails", () => {
        const isNumber = (x: unknown): x is number => typeof x === "number";
        expect(safeParseJSON('"hello"', isNumber)).toBeNull();
        expect(safeParseJSON('{"a":1}', isNumber)).toBeNull();
    });

    it("works with complex validators", () => {
        type Person = { name: string; age: number };
        const isPerson = (x: unknown): x is Person => {
            if (!x || typeof x !== "object") return false;
            const obj = x as Record<string, unknown>;
            return typeof obj.name === "string" && typeof obj.age === "number";
        };

        expect(safeParseJSON('{"name":"Alice","age":30}', isPerson)).toEqual({
            name: "Alice",
            age: 30,
        });
        expect(safeParseJSON('{"name":"Alice"}', isPerson)).toBeNull(); // missing age
        expect(safeParseJSON('{"name":123,"age":30}', isPerson)).toBeNull(); // wrong type
    });
});
