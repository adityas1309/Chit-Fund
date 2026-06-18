import { describe, it, expect } from "vitest";
import type { DecodedEvent } from "../lib/horizon";

describe("horizon event shape", () => {
  it("supports a sample decoded event", () => {
    const e: DecodedEvent = {
      kind: "WinnerSelected",
      circle_id: 1,
      round_number: 1,
      winner: "GABC",
      pot_amount: 300,
    };
    expect(e.kind).toBe("WinnerSelected");
    expect(e.pot_amount).toBe(300);
  });
});
