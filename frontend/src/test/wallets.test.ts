import { describe, it, expect } from "vitest";
import { ALL_WALLETS, WALLETS, networkPassphrase } from "../lib/wallets";

describe("multi-wallet adapter", () => {
  it("exposes three wallet kinds", () => {
    expect(ALL_WALLETS).toHaveLength(3);
    expect(WALLETS.freighter.label).toBe("Freighter");
    expect(WALLETS.albedo.label).toBe("Albedo");
    expect(WALLETS.rabet.label).toBe("Rabet");
  });

  it("every wallet has an installUrl", () => {
    for (const w of ALL_WALLETS) {
      expect(w.installUrl).toMatch(/^https:\/\//);
    }
  });

  it("every wallet implements the WalletAdapter surface", () => {
    for (const w of ALL_WALLETS) {
      expect(typeof w.isAvailable).toBe("function");
      expect(typeof w.getPublicKey).toBe("function");
      expect(typeof w.requestAccess).toBe("function");
      expect(typeof w.signTransaction).toBe("function");
    }
  });

  it("networkPassphrase returns a non-empty string", () => {
    expect(typeof networkPassphrase()).toBe("string");
    expect(networkPassphrase().length).toBeGreaterThan(0);
  });
});
