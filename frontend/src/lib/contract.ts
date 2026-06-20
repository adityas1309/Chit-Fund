// High-level Soroban contract client. Wraps the Stellar JS SDK and the
// generated contract bindings so the rest of the app does not have to deal
// with low-level XDR manipulation.

import {
  Account,
  Address,
  Contract,
  Transaction,
  TransactionBuilder,
  xdr,
  nativeToScVal,
  scValToNative,
  Keypair,
  rpc,
} from "@stellar/stellar-sdk";
import { NETWORK, SAVINGS_CIRCLE_CONTRACT_ID } from "./config";
import { WalletState } from "./wallet";

const server = new rpc.Server(NETWORK.sorobanRpcUrl, { allowHttp: false });

const APPROVE_TTL_LEDGERS = 518_400; // ~1 month of ledgers at ~5s/ledger

let cachedLiveUntil: { ledger: number; expiresAt: number } | null = null;

async function getLiveUntil(): Promise<number> {
  // Cache the latest ledger for ~60s to avoid hammering the RPC node.
  const now = Date.now();
  if (cachedLiveUntil && now < cachedLiveUntil.expiresAt) {
    return cachedLiveUntil.ledger + APPROVE_TTL_LEDGERS;
  }
  const latest = await server.getLatestLedger();
  const ledger = latest.sequence;
  cachedLiveUntil = { ledger, expiresAt: now + 60_000 };
  return ledger + APPROVE_TTL_LEDGERS;
}

export type SelectionMode = "RoundRobin" | "Random";
export type CircleState = "Open" | "Active" | "Complete";

export interface MemberInfo {
  address: string;
  joined_at_round: number;
  has_won: boolean;
  slashed: boolean;
  deposited_current_round: boolean;
  collateral_approved: boolean;
}

export interface RoundInfo {
  round_number: number;
  deadline_ledger: number;
  closed: boolean;
  winner: string | null;
  total_collected: number;
}

export interface CircleView {
  id: number;
  creator: string;
  token: string;
  deposit_amount: number;
  collateral_amount: number;
  round_interval_ledgers: number;
  selection_mode: SelectionMode;
  max_members: number;
  member_count: number;
  state: CircleState;
  current_round: number;
  next_deadline_ledger: number;
  current_round_closed: boolean;
  deposits_this_round: string[];
  pending_defaulters: string[];
  pending_winners: string[];
}

export interface Circle {
  id: number;
  creator: string;
  token: string;
  deposit_amount: number;
  collateral_amount: number;
  round_interval_ledgers: number;
  selection_mode: SelectionMode;
  max_members: number;
  members: MemberInfo[];
  rounds: RoundInfo[];
  state: CircleState;
  rr_cursor: number;
}

const circleContract = () => new Contract(SAVINGS_CIRCLE_CONTRACT_ID);

async function getSourceAccount(publicKey: string): Promise<Account> {
  try {
    return await server.getAccount(publicKey);
  } catch (e) {
    // Friendbot fallback for fresh testnet accounts.
    throw new Error(
      "Failed to load account from Soroban RPC. Is the account funded? " +
        String((e as Error).message ?? e)
    );
  }
}

async function submit(
  tx: Transaction,
  sign: (xdr: string, passphrase: string) => Promise<string>
): Promise<rpc.Api.SendTransactionResponse> {
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error("Simulation failed: " + JSON.stringify(sim));
  }
  const prepared = rpc.assembleTransaction(tx, sim).build();
  const signedXdr = await sign(prepared.toEnvelope().toXDR().toString("base64"), NETWORK.networkPassphrase);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK.networkPassphrase);
  return server.sendTransaction(signedTx);
}

export async function createCircle(
  wallet: WalletState,
  args: {
    creator: string;
    token: string;
    depositAmount: number;
    maxMembers: number;
    roundIntervalLedgers: number;
    selectionMode: SelectionMode;
  }
): Promise<string> {
  const source = await getSourceAccount(args.creator);
  const tx = new TransactionBuilder(source, {
    fee: "1000000",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      circleContract().call(
        "create_circle",
        nativeToScVal(new Address(args.creator), { type: "address" }),
        nativeToScVal(new Address(args.token), { type: "address" }),
        nativeToScVal(args.depositAmount, { type: "i128" }),
        nativeToScVal(args.maxMembers, { type: "u32" }),
        nativeToScVal(args.roundIntervalLedgers, { type: "u32" }),
        nativeToScVal([args.selectionMode], { type: "symbol" })
      )
    )
    .setTimeout(60)
    .build();
  const res = await submit(tx, wallet.signTransaction);
  return res.hash;
}

export async function joinCircle(
  wallet: WalletState,
  args: { member: string; circleId: number }
): Promise<string> {
  const source = await getSourceAccount(args.member);
  const tx = new TransactionBuilder(source, {
    fee: "1000000",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      circleContract().call(
        "join_circle",
        nativeToScVal(args.circleId, { type: "u64" }),
        nativeToScVal(new Address(args.member), { type: "address" })
      )
    )
    .setTimeout(60)
    .build();
  const res = await submit(tx, wallet.signTransaction);
  return res.hash;
}

export async function deposit(
  wallet: WalletState,
  args: { member: string; circleId: number }
): Promise<string> {
  const source = await getSourceAccount(args.member);
  const tx = new TransactionBuilder(source, {
    fee: "1000000",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      circleContract().call(
        "deposit",
        nativeToScVal(args.circleId, { type: "u64" }),
        nativeToScVal(new Address(args.member), { type: "address" })
      )
    )
    .setTimeout(60)
    .build();
  const res = await submit(tx, wallet.signTransaction);
  return res.hash;
}

export async function closeRound(
  wallet: WalletState,
  args: { caller: string; circleId: number }
): Promise<string> {
  const source = await getSourceAccount(args.caller);
  const tx = new TransactionBuilder(source, {
    fee: "1000000",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      circleContract().call(
        "close_round",
        nativeToScVal(args.circleId, { type: "u64" })
      )
    )
    .setTimeout(60)
    .build();
  const res = await submit(tx, wallet.signTransaction);
  return res.hash;
}

export async function approveToken(
  wallet: WalletState,
  args: { owner: string; spender: string; amount: number; token: string }
): Promise<string> {
  // We sign a token pprove invocation. The owner is the user; spender is
  // the savings_circle contract. We use the SAC token interface directly.
  const token = new Contract(args.token);
  const source = await getSourceAccount(args.owner);
  const tx = new TransactionBuilder(source, {
    fee: "1000000",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(
      token.call(
        "approve",
        nativeToScVal(new Address(args.owner), { type: "address" }),
        nativeToScVal(new Address(args.spender), { type: "address" }),
        nativeToScVal(args.amount, { type: "i128" }),
        nativeToScVal(await getLiveUntil(), { type: "u32" })
      )
    )
    .setTimeout(60)
    .build();
  const res = await submit(tx, wallet.signTransaction);
  return res.hash;
}


// Recursively convert BigInt values (returned by Soroban scValToNative
// for u64 / i128 / i256) to plain JS numbers so React/JSON paths do not
// throw "Cannot mix BigInt and other types".
function toPlain(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.map(toPlain);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = toPlain(v);
    }
    return out;
  }
  return value;
}
async function readOnly<T>(fn: string, ...args: xdr.ScVal[]): Promise<T> {
  const source = Keypair.random().publicKey();
  const account = new Account(source, "0");
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK.networkPassphrase,
  })
    .addOperation(circleContract().call(fn, ...args))
    .setTimeout(60)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim}`);
  }
  if (!sim.result) {
    throw new Error("Simulation returned no result");
  }
  return toPlain(scValToNative(sim.result.retval)) as T;
}

export async function getCircle(circleId: number): Promise<Circle> {
  return readOnly<Circle>("get_circle", nativeToScVal(circleId, { type: "u64" }));
}

export async function getCircleState(circleId: number): Promise<CircleView> {
  return readOnly<CircleView>(
    "get_circle_state",
    nativeToScVal(circleId, { type: "u64" })
  );
}

export async function listOpenCircles(): Promise<number[]> {
  return readOnly<number[]>("list_open_circles");
}

export async function getAllCircles(): Promise<number[]> {
  return readOnly<number[]>("get_all_circles");
}

export async function nextCircleId(): Promise<number> {
  return readOnly<number>("next_circle_id");
}

// Friendbot helper for testnet onboarding.
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  if (NETWORK.network !== "testnet" || !NETWORK.friendbotUrl) return;
  const url = `${NETWORK.friendbotUrl}?addr=${publicKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Friendbot failed: HTTP ${res.status}`);
  }
}

