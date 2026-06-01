import { describe, it, expect, vi } from "vitest";
import { subscribeDuck, duckMedia } from "./mediaDuck";

describe("mediaDuck", () => {
    it("notifies all subscribers with the duck duration", () => {
        const a = vi.fn();
        const b = vi.fn();
        const unsubA = subscribeDuck(a);
        const unsubB = subscribeDuck(b);

        duckMedia(1500);

        expect(a).toHaveBeenCalledWith(1500);
        expect(b).toHaveBeenCalledWith(1500);

        unsubA();
        unsubB();
    });

    it("stops notifying after unsubscribe", () => {
        const fn = vi.fn();
        const unsub = subscribeDuck(fn);
        unsub();

        duckMedia(1000);

        expect(fn).not.toHaveBeenCalled();
    });
});
