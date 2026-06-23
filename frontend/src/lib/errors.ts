// Domain error types for the Susu frontend.
//
// We expose a small, named taxonomy so the UI can decide whether to
// retry, prompt the user to switch networks, or surface a hard
// failure. Every error includes a stable `code` that other layers
// (toasts, telemetry, tests) can switch on.

export type SusuErrorCode =
  | "WALLET_NOT_FOUND"
  | "WALLET_USER_REJECTED"
  | "WALLET_WRONG_NETWORK"
  | "SIMULATION_FAILED"
  | "RPC_REJECTED"
  | "ON_CHAIN_FAILED"
  | "CONFIRMATION_TIMEOUT"
  | "HORIZON_UNAVAILABLE"
  | "FRIENDBOT_FAILED"
  | "INVALID_INPUT";

export class SusuError extends Error {
  readonly code: SusuErrorCode;
  readonly cause?: unknown;
  readonly details?: Record<string, unknown>;

  constructor(
    code: SusuErrorCode,
    message: string,
    options: { cause?: unknown; details?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = "SusuError";
    this.code = code;
    this.cause = options.cause;
    this.details = options.details;
  }

  isUserRejection(): boolean {
    return this.code === "WALLET_USER_REJECTED";
  }

  isRecoverable(): boolean {
    return (
      this.code === "WALLET_WRONG_NETWORK" ||
      this.code === "WALLET_NOT_FOUND" ||
      this.code === "HORIZON_UNAVAILABLE" ||
      this.code === "FRIENDBOT_FAILED" ||
      this.code === "CONFIRMATION_TIMEOUT"
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export function asSusuError(e: unknown, fallback: SusuErrorCode = "RPC_REJECTED"): SusuError {
  if (e instanceof SusuError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  if (/User rejected|rejected/i.test(msg)) {
    return new SusuError("WALLET_USER_REJECTED", msg, { cause: e });
  }
  if (/network/i.test(msg) && /(switch|mismatch|testnet)/i.test(msg)) {
    return new SusuError("WALLET_WRONG_NETWORK", msg, { cause: e });
  }
  return new SusuError(fallback, msg, { cause: e });
}
