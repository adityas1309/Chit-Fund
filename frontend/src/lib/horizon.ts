// Horizon API helpers. Used for fetching accounts, submitting transactions
// to the classic Stellar network, and the SSE feed for live round events.

import { Horizon } from "@stellar/stellar-sdk";
import { NETWORK } from "./config";

const horizon = new Horizon.Server(NETWORK.horizonUrl, { allowHttp: false });

export interface AccountInfo {
  account_id: string;
  balances: { asset_type: string; balance: string; asset_code?: string; asset_issuer?: string }[];
  sequence: string;
}

export async function loadAccount(publicKey: string): Promise<AccountInfo> {
  return (await horizon.loadAccount(publicKey)) as unknown as AccountInfo;
}

export interface ContractEvent {
  type: "contract" | "system" | "diagnostic";
  contractId?: string;
  topics: string[];
  data: unknown;
  txHash: string;
  ledger: number;
  timestamp: string;
}

export interface LiveEvent extends ContractEvent {
  decoded: DecodedEvent | null;
}

export type DecodedEvent =
  | { kind: "CircleCreated"; circle_id: number; creator: string; token: string; deposit_amount: number; max_members: number }
  | { kind: "MemberJoined"; circle_id: number; member: string }
  | { kind: "DepositReceived"; circle_id: number; member: string; amount: number }
  | { kind: "RoundClosed"; circle_id: number; round_number: number; total_collected: number; defaulters: string[] }
  | { kind: "WinnerSelected"; circle_id: number; round_number: number; winner: string; pot_amount: number }
  | { kind: "MemberSlashedLocally"; circle_id: number; member: string }
  | { kind: "MemberSlashed"; defaulter: string; collateral_amount: number; recipients_count: number }
  | { kind: "DistributionCompleted"; total: number; recipients_count: number }
  | { kind: "CircleCompleted"; circle_id: number }
  | { kind: "Unknown"; raw: string };

/**
 * Subscribe to the live Horizon event stream for a particular contract.
 * Returns an unsubscribe function.
 */
export function subscribeToEvents(
  contractIds: string[],
  onEvent: (e: LiveEvent) => void,
  onError?: (e: Error) => void
): () => void {
  if (contractIds.length === 0) {
    return () => {};
  }
  const params = new URLSearchParams();
  for (const id of contractIds) {
    params.append("contract_id", id);
  }
  const url = `${NETWORK.horizonUrl}/events?${params.toString()}`;

  let closed = false;
  let es: EventSource | null = null;
  let notified = false;

  // Some Horizon deployments (notably testnet) do not expose the
  // /events SSE endpoint. EventSource will fire an error event with a
  // 404 status, which we suppress after the first failure so the
  // console does not stay noisy.
  const notifyOnce = (e: Error) => {
    if (closed || notified) return;
    notified = true;
    onError?.(e);
  };

  try {
    es = new EventSource(url);
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        const decoded = decodeEvent(parsed);
        onEvent({ ...parsed, decoded });
      } catch (e) {
        notifyOnce(e as Error);
      }
    };
    es.onerror = () => {
      // EventSource auto-retries internally, so we only surface the first
      // failure. Reopening the same URL on a 404 would just spam the
      // console, so we close the stream instead.
      if (closed) return;
      notifyOnce(new Error("EventStream unavailable; live feed disabled."));
      closed = true;
      es?.close();
      es = null;
    };
  } catch (e) {
    notifyOnce(e as Error);
  }

  return () => {
    closed = true;
    es?.close();
  };
}

function decodeEvent(raw: ContractEvent): DecodedEvent | null {
  try {
    const topics = raw.topics ?? [];
    const data = raw.data as unknown;
    const topic0 = topics[0];
    if (!topic0) return null;
    switch (topic0) {
      case "circle_created": {
        const d = data as { creator: string; token: string; deposit_amount: number; max_members: number };
        return { kind: "CircleCreated", circle_id: Number(topics[1]), creator: d.creator, token: d.token, deposit_amount: d.deposit_amount, max_members: d.max_members };
      }
      case "member_joined": {
        return { kind: "MemberJoined", circle_id: Number(topics[1]), member: String(topics[2]) };
      }
      case "deposit_received": {
        const d = data as { amount: number };
        return { kind: "DepositReceived", circle_id: Number(topics[1]), member: String(topics[2]), amount: d.amount };
      }
      case "round_closed": {
        const d = data as { total_collected: number; defaulters: string[] };
        return { kind: "RoundClosed", circle_id: Number(topics[1]), round_number: Number(topics[2]), total_collected: d.total_collected, defaulters: d.defaulters };
      }
      case "winner_selected": {
        const d = data as { pot_amount: number };
        return { kind: "WinnerSelected", circle_id: Number(topics[1]), round_number: Number(topics[2]), winner: String(topics[3]), pot_amount: d.pot_amount };
      }
      case "member_slashed_locally": {
        return { kind: "MemberSlashedLocally", circle_id: Number(topics[1]), member: String(topics[2]) };
      }
      case "member_slashed": {
        const d = data as { collateral_amount: number; recipients_count: number };
        return { kind: "MemberSlashed", defaulter: String(topics[1]), collateral_amount: d.collateral_amount, recipients_count: d.recipients_count };
      }
      case "distribution_completed": {
        const d = data as { total: number; recipients_count: number };
        return { kind: "DistributionCompleted", total: d.total, recipients_count: d.recipients_count };
      }
      case "circle_completed": {
        return { kind: "CircleCompleted", circle_id: Number(topics[1]) };
      }
      default:
        return { kind: "Unknown", raw: topic0 };
    }
  } catch {
    return null;
  }
}
