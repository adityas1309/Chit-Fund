// Helpers for fetching the connected wallet's XLM balance from Horizon.
//
// The frontend is hard-locked to Stellar testnet, so we use Horizon's
// `/accounts/:pk` endpoint, find the native (XLM) balance row, and
// return it as a big-int safe string plus a numeric XLM amount.

import { Horizon } from "@stellar/stellar-sdk";
import { NETWORK } from "./config";
import { SusuError } from "./errors";

export interface XlmBalance {
  /** Raw stroops as a string (1 XLM = 10_000_000 stroops). */
  stroops: string;
  /** Numeric XLM amount (truncated to 7 decimal places). */
  xlm: number;
  /** Subentry count, useful for the UI. */
  subentryCount: number;
}

const STROOPS_PER_XLM = 10_000_000;

function parseStroops(raw: string | number): bigint {
  if (typeof raw === "number") return BigInt(Math.trunc(raw * STROOPS_PER_XLM));
  // Horizon returns balances as decimal strings, but the native asset
  // is also expressed in stroops as a decimal. Treat it as bigint.
  return BigInt(Math.trunc(Number(raw) * STROOPS_PER_XLM));
}

export async function fetchXlmBalance(publicKey: string, signal?: AbortSignal): Promise<XlmBalance> {
  const server = new Horizon.Server(NETWORK.horizonUrl, { allowHttp: false });
  try {
    const account = await server.loadAccount(publicKey);
    if (signal?.aborted) {
      throw new SusuError("HORIZON_UNAVAILABLE", "Balance fetch aborted");
    }
    const native = account.balances.find((b) => b.asset_type === "native");
    if (!native) {
      // A funded account always has a native balance row. Treat its
      // absence as a server-side anomaly worth surfacing.
      return { stroops: "0", xlm: 0, subentryCount: account.subentry_count ?? 0 };
    }
    const stroops = parseStroops(native.balance);
    return {
      stroops: stroops.toString(),
      xlm: Number(stroops) / STROOPS_PER_XLM,
      subentryCount: account.subentry_count ?? 0,
    };
  } catch (e) {
    if (e instanceof SusuError) throw e;
    const msg = (e as Error)?.message ?? String(e);
    if (/Not Found/i.test(msg) || /404/.test(msg)) {
      throw new SusuError("HORIZON_UNAVAILABLE", "Account not found on Horizon. Friendbot-fund it first.", { cause: e });
    }
    throw new SusuError("HORIZON_UNAVAILABLE", "Could not reach Horizon: " + msg, { cause: e });
  }
}

export function formatXlm(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 4 }) + " XLM";
}
