// src/test/setup.ts
import { expect, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

// Add jest-dom matchers to Vitest's expect
// eslint-disable-next-line @typescript-eslint/no-explicit-any
expect.extend(matchers as any);

// Clean up the DOM after each test to avoid cross-test leakage
afterEach(() => {
    cleanup();
});