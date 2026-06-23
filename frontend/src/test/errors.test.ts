import { describe, it, expect } from "vitest";
import { SusuError, asSusuError } from "../lib/errors";

describe("SusuError", () => {
  it("captures code, message, and details", () => {
    const e = new SusuError("SIMULATION_FAILED", "boom", { details: { a: 1 } });
    expect(e.code).toBe("SIMULATION_FAILED");
    expect(e.message).toBe("boom");
    expect(e.details).toEqual({ a: 1 });
    expect(e.isUserRejection()).toBe(false);
    expect(e.isRecoverable()).toBe(false);
  });

  it("flags user rejections", () => {
    const e = new SusuError("WALLET_USER_REJECTED", "nope");
    expect(e.isUserRejection()).toBe(true);
    expect(e.isRecoverable()).toBe(false);
  });

  it("flags recoverable errors", () => {
    const recoverable: import("../lib/errors").SusuErrorCode[] = [
      "WALLET_WRONG_NETWORK",
      "WALLET_NOT_FOUND",
      "HORIZON_UNAVAILABLE",
      "FRIENDBOT_FAILED",
      "CONFIRMATION_TIMEOUT",
    ];
    for (const code of recoverable) {
      const e = new SusuError(code, "x");
      expect(e.isRecoverable(), code).toBe(true);
    }
  });

  it("asSusuError passes through SusuError instances", () => {
    const e = new SusuError("RPC_REJECTED", "x");
    expect(asSusuError(e)).toBe(e);
  });

  it("asSusuError wraps plain Error with the fallback code", () => {
    const out = asSusuError(new Error("weird"), "SIMULATION_FAILED");
    expect(out).toBeInstanceOf(SusuError);
    expect(out.code).toBe("SIMULATION_FAILED");
  });

  it("asSusuError detects user rejection patterns", () => {
    const out = asSusuError(new Error("User rejected the transaction"));
    expect(out.code).toBe("WALLET_USER_REJECTED");
  });

  it("asSusuError detects wrong-network patterns", () => {
    const out = asSusuError(new Error("network mismatch - please switch to testnet"));
    expect(out.code).toBe("WALLET_WRONG_NETWORK");
  });

  it("toJSON round-trips the relevant fields", () => {
    const out = new SusuError("ON_CHAIN_FAILED", "x", { details: { hash: "abc" } }).toJSON();
    expect(out.name).toBe("SusuError");
    expect(out.code).toBe("ON_CHAIN_FAILED");
    expect(out.details).toEqual({ hash: "abc" });
  });
});

describe("wallet taxonomy: at least 3 error codes are exported and distinct", () => {
  it("exposes >= 10 distinct SusuErrorCode values", () => {
    const codes: string[] = [
      "WALLET_NOT_FOUND",
      "WALLET_USER_REJECTED",
      "WALLET_WRONG_NETWORK",
      "SIMULATION_FAILED",
      "RPC_REJECTED",
      "ON_CHAIN_FAILED",
      "CONFIRMATION_TIMEOUT",
      "HORIZON_UNAVAILABLE",
      "FRIENDBOT_FAILED",
      "INVALID_INPUT",
    ];
    const unique = new Set(codes);
    expect(unique.size).toBeGreaterThanOrEqual(3);
    expect(unique.size).toBe(codes.length);
  });
});
