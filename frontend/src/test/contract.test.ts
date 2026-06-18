import { describe, it, expect } from "vitest";
import { isConfigured } from "../lib/config";

describe("config", () => {
  it("isConfigured returns a boolean", () => {
    expect(typeof isConfigured()).toBe("boolean");
  });
});
