import { describe, it, expect } from "vitest";
import { formatXlm } from "../lib/balance";

describe("formatXlm", () => {
  it("renders zero correctly", () => {
    expect(formatXlm(0)).toBe("0 XLM");
  });
  it("rounds to 4 fractional digits", () => {
    expect(formatXlm(12.345678)).toMatch(/12\.3457 XLM|12\.3456 XLM/);
  });
  it("keeps the XLM suffix", () => {
    expect(formatXlm(1).endsWith("XLM")).toBe(true);
  });
});
