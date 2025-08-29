// src/test/setup.ts
import { expect, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

// Add jest-dom matchers to Vitest's expect
expect.extend(matchers as any);

// Clean up the DOM after each test to avoid cross-test leakage
afterEach(() => {
    cleanup();
});