import { describe, it, expect } from "vitest";
import { isConfigured } from "../lib/config";

describe("config", () => {
  it("isConfigured returns a boolean", () => {
    expect(typeof isConfigured()).toBe("boolean");
  });
});

// Regression: contract.ts must not pass a hardcoded live_until above the
// Stellar Asset Contract max (3,110,400). Previously 9_999_999 was
// hardcoded in approveToken, which caused the SAC to reject the call with
// "live_until is greater than max".
describe("approveToken live_until", () => {
  it("uses a computed live_until, not a hardcoded value above the SAC max", async () => {
    // Use Vite raw query to load the source as a string. This is supported
    // by the vitest environment and avoids needing node:fs or @types/node.
    const source: string = (await import("../lib/contract.ts?raw")).default;
    const idx = source.indexOf("approveToken");
    expect(idx, "approveToken must be defined in contract.ts").toBeGreaterThan(-1);
    const approveSection = source.slice(idx);
    const m = approveSection.match(
      /nativeToScVal\(\s*([\s\S]*?)\s*,\s*\{\s*type:\s*"u32"\s*\}\s*\)/
    );
    expect(
      m,
      "expected a nativeToScVal call with a u32 type inside approveToken"
    ).not.toBeNull();
    const value = (m?.[1] ?? "").trim();
    expect(value).not.toMatch(/^\d/);
    expect(value).toMatch(/getLiveUntil|\+\s*\d|-\s*\d/);
  });
});
// Regression: readOnly must wrap scValToNative with toPlain to convert
// BigInt values to Number, otherwise React/JSON code throws
// "Cannot mix BigInt and other types" when the contract returns u64 fields.
describe("readOnly toPlain wrapper", () => {
  it("wraps scValToNative with toPlain inside readOnly", async () => {
    const source: string = (await import("../lib/contract.ts?raw")).default;
    const idx = source.indexOf("async function readOnly");
    expect(idx, "readOnly must be defined in contract.ts").toBeGreaterThan(-1);
    const section = source.slice(idx);
    // Find the return statement that uses scValToNative
    const m = section.match(/return\s+([\s\S]*?)\s+as\s+T;/);
    expect(
      m,
      "expected readOnly to return something cast to T"
    ).not.toBeNull();
    const expr = (m?.[1] ?? "").trim();
    // It must start with toPlain(
    expect(expr).toMatch(/^toPlain\(/);
    // And it must call scValToNative inside that wrapper
    expect(expr).toMatch(/scValToNative/);
  });
});
// Regression: create_circle passes selectionMode as a Soroban enum, which
// decodes from a ScVal::ScvVec containing a single ScVal::ScvSymbol.
// Encoding it as a bare scvString (or even a bare scvSymbol) makes the
// contract panic with "UnreachableCodeReached" / "InvalidAction".
describe("createCircle selectionMode encoding", () => {
  it("encodes selectionMode as a ScvVec[ScvSymbol], the form Soroban enums decode from", async () => {
    const source: string = (await import("../lib/contract.ts?raw")).default;
    const idx = source.indexOf("create_circle");
    expect(idx, "create_circle call must exist in contract.ts").toBeGreaterThan(-1);
    const section = source.slice(idx);
    // The selectionMode arg must be wrapped in an array AND carry the
    // "symbol" type option, so the SDK emits a symbol vec.
    const m = section.match(
      /nativeToScVal\(\s*\[\s*args\.selectionMode\s*\]\s*,\s*\{[^}]*type:\s*"symbol"[^}]*\}\s*\)/
    );
    expect(
      m,
      "expected `nativeToScVal([args.selectionMode], { type: \"symbol\" })` inside createCircle"
    ).not.toBeNull();
  });
});


// Regression: when a user "creates a circle" the dashboard used to take the
// hash returned by sendTransaction at face value and immediately navigate to
// /circles. Soroban's sendTransaction is asynchronous, so the tx could be
// txBadSeq, txBadAuth, or revert inside the contract while the UI still
// showed a "Circle created" toast. After the fix, submit() must:
//   1. Reject when sendTransaction itself returns status === "ERROR".
//   2. Poll getTransaction until the tx reaches a terminal status, throwing
//      on FAILED and returning only on SUCCESS.
describe("submit() polls for confirmation", () => {
  it("calls getTransaction after sendTransaction and waits for a terminal status", async () => {
    const source: string = (await import("../lib/contract.ts?raw")).default;
    const idx = source.indexOf("async function submit");
    expect(idx, "submit() must be defined in contract.ts").toBeGreaterThan(-1);
    const section = source.slice(idx);
    // The send result must be inspected; a status of "ERROR" must throw.
    expect(section, "sendTransaction result must be checked for ERROR status").toMatch(
      /\.status\s*===\s*"ERROR"/
    );
    // The submit body must invoke getTransaction to poll for confirmation.
    expect(section, "submit() must call server.getTransaction to confirm").toMatch(
      /getTransaction\s*\(/
    );
    // It must treat SUCCESS and FAILED as terminal states.
    expect(section, "submit() must recognise GetTransactionStatus.SUCCESS").toMatch(
      /GetTransactionStatus\.SUCCESS/
    );
    expect(section, "submit() must throw on GetTransactionStatus.FAILED").toMatch(
      /GetTransactionStatus\.FAILED/
    );
  });
});
