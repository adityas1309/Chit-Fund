import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useCircle } from "../hooks/useCircle";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { useCurrentLedger } from "../hooks/useCurrentLedger";
import { useWallet } from "../lib/use-wallet";
import { useToast } from "../lib/use-toast";
import { isConfigured, SAVINGS_CIRCLE_CONTRACT_ID, CIRCLE_TOKEN_CONTRACT_ID, NETWORK } from "../lib/config";
import {
  approveToken,
  closeRound,
  deposit as contractDeposit,
  joinCircle,
} from "../lib/contract";
import { MemberRow } from "../components/MemberRow";
import { CountdownTimer } from "../components/CountdownTimer";
import { RoundProgress } from "../components/RoundProgress";
import { EventFeed } from "../components/EventFeed";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";

const STROOPS_PER_XLM = 10_000_000;

function fmt(amount: number): string {
  return (amount / STROOPS_PER_XLM).toLocaleString(undefined, { maximumFractionDigits: 4 }) + " XLM";
}

function shortAddr(a: string): string {
  if (!a || a.length <= 10) return a;
  return a.slice(0, 4) + "…" + a.slice(-4);
}

export function CircleDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const circleId = id ? Number(id) : null;
  const valid = circleId !== null && Number.isInteger(circleId) && circleId >= 0;
  if (!valid) return <Navigate to="/circles" replace />;
  return <CircleDashboard id={circleId as number} />;
}

function CircleDashboard({ id }: { id: number }) {
  const { circle, view, loading, error, refresh } = useCircle(id);
  const { events, connected } = useLiveEvents();
  const { ledger: currentLedger } = useCurrentLedger();
  const wallet = useWallet();
  const { show } = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const relevant = useMemo(() => events.filter((e) => {
    const d = e.decoded;
    if (!d) return false;
    switch (d.kind) {
      case "CircleCreated":
      case "MemberJoined":
      case "DepositReceived":
      case "RoundClosed":
      case "WinnerSelected":
      case "MemberSlashedLocally":
      case "CircleCompleted":
        return d.circle_id === id;
      default:
        return false;
    }
  }), [events, id]);

  useEffect(() => {
    if (relevant.length > 0) {
      void refresh();
    }
  }, [relevant.length, refresh]);

  if (!isConfigured()) {
    return (
      <EmptyState
        title="Contracts not configured"
        description="Set VITE_SAVINGS_CIRCLE_CONTRACT_ID to load circle data."
        actionLabel="Back to browse"
        actionTo="/circles"
      />
    );
  }

  if (loading && !circle) {
    return (
      <div className="card flex items-center justify-center py-16">
        <Spinner label="Loading circle…" />
      </div>
    );
  }

  if (error || !circle || !view) {
    return (
      <div className="card border-rust-200 bg-rust-50 text-sm text-rust-700">
        Could not load circle #{id}: {error ?? "not found"}
      </div>
    );
  }

  const isMember = wallet.publicKey !== null && circle.members.some((m) => m.address === wallet.publicKey);
  const myInfo = isMember ? circle.members.find((m) => m.address === wallet.publicKey) ?? null : null;
  const hasDepositedThisRound = myInfo?.deposited_current_round ?? false;
  const isSlashed = myInfo?.slashed ?? false;
  const readyToClose = view.current_round_closed === false && currentLedger > 0 && currentLedger >= view.next_deadline_ledger;
  const totalRounds = circle.max_members;
  async function onJoin() {
    if (!wallet.publicKey) return;
    setBusyAction("approve");
    try {
      const approveHash = await approveToken(wallet, {
        owner: wallet.publicKey,
        spender: SAVINGS_CIRCLE_CONTRACT_ID,
        amount: circle!.collateral_amount,
        token: CIRCLE_TOKEN_CONTRACT_ID,
      });
      show("info", "Approve: " + approveHash.slice(0, 8) + "…");
      setBusyAction("join");
      const hash = await joinCircle(wallet, { member: wallet.publicKey, circleId: id });
      show("success", "Joined · tx " + hash.slice(0, 8) + "…");
      await refresh();
    } catch (e) {
      show("error", "Join failed: " + (e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function onDeposit() {
    if (!wallet.publicKey) return;
    setBusyAction("approve");
    try {
      const approveHash = await approveToken(wallet, {
        owner: wallet.publicKey,
        spender: SAVINGS_CIRCLE_CONTRACT_ID,
        amount: circle!.deposit_amount,
        token: CIRCLE_TOKEN_CONTRACT_ID,
      });
      show("info", "Approve: " + approveHash.slice(0, 8) + "…");
      setBusyAction("deposit");
      const hash = await contractDeposit(wallet, { member: wallet.publicKey, circleId: id });
      show("success", "Deposit sent · tx " + hash.slice(0, 8) + "…");
      await refresh();
    } catch (e) {
      show("error", "Deposit failed: " + (e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  async function onCloseRound() {
    if (!wallet.publicKey) return;
    setBusyAction("close");
    try {
      const hash = await closeRound(wallet, { caller: wallet.publicKey, circleId: id });
      show("success", "Round closed · tx " + hash.slice(0, 8) + "…");
      await refresh();
    } catch (e) {
      show("error", "Close failed: " + (e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Link to="/circles" className="hover:text-ink-800">Circles</Link>
            <span>/</span>
            <span className="font-mono text-ink-700">#{id}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            {view.max_members}-seat circle · <span className="text-ink-500">{fmt(view.deposit_amount)}/round</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <span className="pill-tab">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-400" />
              {circle.creator ? "Creator " + shortAddr(circle.creator) : "—"}
            </span>
            <span className="pill-tab">Mode · {circle.selection_mode}</span>
            <span className="pill-tab">Round · ~{circle.round_interval_ledgers} ledgers</span>
            <span className="pill-tab">Contract · {shortAddr(SAVINGS_CIRCLE_CONTRACT_ID)}</span>
          </div>
        </div>
        <span className={view.state === "Open" ? "badge-green" : view.state === "Active" ? "badge-amber" : "badge-ink"}>
          <span className={"h-1.5 w-1.5 rounded-full " + (view.state === "Open" ? "bg-leaf-500" : view.state === "Active" ? "bg-amber-500 animate-pulse-soft" : "bg-ink-100")} />
          {view.state}
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Current round</p>
              <h2 className="mt-0.5 font-display text-2xl font-semibold text-ink-900">
                Round {view.current_round} <span className="text-ink-400">/ {totalRounds}</span>
              </h2>
            </div>
            <span className={connected ? "badge-green" : "badge-slate"}>
              <span className={"h-1.5 w-1.5 rounded-full " + (connected ? "bg-leaf-500 animate-pulse-soft" : "bg-ink-400")} />
              {connected ? "Live" : "Idle"}
            </span>
          </div>

          <RoundProgress
            currentRound={view.current_round}
            totalRounds={totalRounds}
            depositsCount={view.deposits_this_round.length}
            totalMembers={view.member_count}
          />

          <div className="grid items-stretch gap-3 sm:grid-cols-3">
            <Tile label="Next deadline">
              <CountdownTimer
                deadlineLedger={view.next_deadline_ledger}
                currentLedger={currentLedger || view.next_deadline_ledger}
                large
              />
            </Tile>
            <Tile label="Members">
              <p className="font-display text-3xl font-semibold tabular-nums text-ink-900">
                {view.member_count} <span className="text-base text-ink-500">/ {view.max_members}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-ink-500">{view.max_members - view.member_count} seats open</p>
            </Tile>
            <Tile label="Pot this round">
              <p className="font-display text-3xl font-semibold tabular-nums text-ink-900">
                {fmt(Number(view.deposits_this_round.length) * Number(view.deposit_amount))}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-500">
                of {fmt(Number(view.deposit_amount) * Number(view.member_count))} if everyone deposits
              </p>
            </Tile>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-5">
            {!wallet.isConnected ? (
              <span className="text-sm text-ink-500">Connect Freighter to interact with this circle.</span>
            ) : wallet.networkMismatch ? (
              <div className="rounded-lg bg-rust-50 px-3 py-2 text-sm text-rust-700 ring-1 ring-rust-200">
                Freighter is connected to a different network. Switch to <span className="font-semibold">{NETWORK.label}</span> in the extension to continue.
              </div>
            ) : (
              <>
                {view.state === "Open" && !isMember && (
                  <button
                    type="button"
                    onClick={onJoin}
                    disabled={busyAction !== null}
                    className="btn-amber"
                  >
                    {busyAction === "approve" ? <><Spinner size="sm" tone="white" /> Approving…</>
                      : busyAction === "join" ? <><Spinner size="sm" tone="white" /> Joining…</>
                      : "Join circle · locks collateral"}
                  </button>
                )}
                {view.state === "Open" && isMember && (
                  <span className="badge-amber">Waiting for the circle to fill before round 1 starts.</span>
                )}
                {view.state === "Active" && isMember && !isSlashed && !hasDepositedThisRound && (
                  <button
                    type="button"
                    onClick={onDeposit}
                    disabled={busyAction !== null}
                    className="btn-primary"
                  >
                    {busyAction === "approve" ? <><Spinner size="sm" tone="white" /> Approving…</>
                      : busyAction === "deposit" ? <><Spinner size="sm" tone="white" /> Depositing…</>
                      : `Deposit ${fmt(view.deposit_amount)}`}
                  </button>
                )}
                {view.state === "Active" && hasDepositedThisRound && (
                  <span className="badge-green">You deposited this round</span>
                )}
                {view.state === "Active" && isSlashed && (
                  <span className="badge-red">You were slashed this round</span>
                )}
                {view.state === "Active" && readyToClose && (
                  <button
                    type="button"
                    onClick={onCloseRound}
                    disabled={busyAction !== null}
                    className="btn-secondary"
                  >
                    {busyAction === "close" ? <><Spinner size="sm" /> Closing…</> : "Close round"}
                  </button>
                )}
                {view.state === "Active" && !readyToClose && (
                  <span className="text-xs text-ink-500">Round can be closed once the deadline ledger is reached.</span>
                )}
                {view.state === "Complete" && (
                  <span className="badge-ink">Circle complete · all rounds paid out</span>
                )}
              </>
            )}
          </div>
        </section>

        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Members</h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">{circle.members.length} joined</span>
          </div>
          <MemberRow members={circle.members} myAddress={wallet.publicKey} />
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Live</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-900">Event feed</h2>
          </div>
          <span className={connected ? "badge-green" : "badge-slate"}>
            <span className={"h-1.5 w-1.5 rounded-full " + (connected ? "bg-leaf-500 animate-pulse-soft" : "bg-ink-400")} />
            {connected ? "Streaming" : "Idle"}
          </span>
        </div>
        <EventFeed
          events={events.filter((e) => {
            const d = e.decoded;
            if (!d) return false;
            switch (d.kind) {
              case "CircleCreated":
              case "MemberJoined":
              case "DepositReceived":
              case "RoundClosed":
              case "WinnerSelected":
              case "MemberSlashedLocally":
              case "CircleCompleted":
                return d.circle_id === id;
              default:
                return true;
            }
          })}
          emptyHint="Events will appear here as the round progresses."
        />
      </section>
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-ink-50/60 p-4 ring-1 ring-ink-200/70">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}