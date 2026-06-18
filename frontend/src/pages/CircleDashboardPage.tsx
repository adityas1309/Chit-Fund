import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useCircle } from "../hooks/useCircle";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { useCurrentLedger } from "../hooks/useCurrentLedger";
import { useWallet } from "../lib/use-wallet";
import { useToast } from "../lib/use-toast";
import { isConfigured, SAVINGS_CIRCLE_CONTRACT_ID, CIRCLE_TOKEN_CONTRACT_ID } from "../lib/config";
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
  return (amount / STROOPS_PER_XLM).toFixed(4) + " XLM";
}

function shortAddr(a: string): string {
  if (!a || a.length <= 10) return a;
  return a.slice(0, 4) + "..." + a.slice(-4);
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

  // Auto-refresh the circle view whenever a relevant event arrives.
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
      <div className="card flex items-center justify-center">
        <Spinner label="Loading circle..." />
      </div>
    );
  }

  if (error || !circle || !view) {
    return (
      <div className="card border-red-200 bg-red-50 text-sm text-red-700">
        Could not load circle #{id}: {error ?? "not found"}
      </div>
    );
  }

  const isMember = wallet.publicKey !== null && circle.members.some((m) => m.address === wallet.publicKey);
  const myInfo = isMember ? circle.members.find((m) => m.address === wallet.publicKey) ?? null : null;
  const hasDepositedThisRound = myInfo?.deposited_current_round ?? false;
  const isSlashed = myInfo?.slashed ?? false;

  async function onJoin() {
    if (!wallet.publicKey) return;
    setBusyAction("join");
    try {
      setBusyAction("approve");
      const approveHash = await approveToken(wallet, {
        owner: wallet.publicKey,
        spender: SAVINGS_CIRCLE_CONTRACT_ID,
        amount: circle!.collateral_amount,
        token: CIRCLE_TOKEN_CONTRACT_ID,
      });
      show("info", "Approve: " + approveHash.slice(0, 8) + "...");
      setBusyAction("join");
      const hash = await joinCircle(wallet, { member: wallet.publicKey, circleId: id });
      show("success", "Joined. Tx: " + hash.slice(0, 8) + "...");
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
      show("info", "Approve: " + approveHash.slice(0, 8) + "...");
      setBusyAction("deposit");
      const hash = await contractDeposit(wallet, { member: wallet.publicKey, circleId: id });
      show("success", "Deposit sent. Tx: " + hash.slice(0, 8) + "...");
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
      show("success", "Round closed. Tx: " + hash.slice(0, 8) + "...");
      await refresh();
    } catch (e) {
      show("error", "Close failed: " + (e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  const totalRounds = circle.max_members;
  const readyToClose = currentLedger >= view.next_deadline_ledger && !view.current_round_closed && view.state === "Active";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/circles" className="text-sm text-slate-500 hover:text-slate-700">&larr; All circles</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Circle #{id}</h1>
          <p className="text-sm text-slate-500">
            Created by <span className="font-mono">{shortAddr(circle.creator)}</span> .
            {" "}<span className={view.state === "Active" ? "badge-green" : view.state === "Open" ? "badge-amber" : "badge-slate"}>{view.state}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-sm text-slate-500">
          <div>Deposit: <span className="font-mono text-slate-900">{fmt(circle.deposit_amount)}</span></div>
          <div>Collateral: <span className="font-mono text-slate-900">{fmt(circle.collateral_amount)}</span></div>
          <div>Mode: <span className="font-mono text-slate-900">{circle.selection_mode}</span></div>
          <div>Round: <span className="font-mono text-slate-900">~{circle.round_interval_ledgers} ledgers</span></div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Round {view.current_round} of {totalRounds}</h2>
            <span className={connected ? "badge-green" : "badge-slate"}>
              {connected ? "Live" : "Idle"}
            </span>
          </div>
          <RoundProgress
            currentRound={view.current_round}
            totalRounds={totalRounds}
            depositsCount={view.deposits_this_round.length}
            totalMembers={view.member_count}
          />
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Next deadline</p>
              <CountdownTimer
                deadlineLedger={view.next_deadline_ledger}
                currentLedger={currentLedger || view.next_deadline_ledger}
                large
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Members</p>
              <div className="mt-1 text-2xl font-bold">{view.member_count} <span className="text-sm font-normal text-slate-500">/ {view.max_members}</span></div>
              <p className="text-xs text-slate-500">Seats: {view.max_members - view.member_count} open</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {view.state === "Open" && wallet.isConnected && !isMember && (
              <button
                type="button"
                onClick={onJoin}
                disabled={busyAction !== null}
                className="btn-primary"
              >
                {busyAction === "approve" ? <Spinner size="sm" /> : null}
                {busyAction === "approve" ? "Approving..." : busyAction === "join" ? <Spinner size="sm" /> : "Join circle (locks collateral)"}
              </button>
            )}
            {view.state === "Active" && isMember && !isSlashed && !hasDepositedThisRound && (
              <button
                type="button"
                onClick={onDeposit}
                disabled={busyAction !== null}
                className="btn-primary"
              >
                {busyAction === "approve" ? <Spinner size="sm" /> : null}
                {busyAction === "approve" ? "Approving..." : busyAction === "deposit" ? <Spinner size="sm" /> : "Deposit for this round"}
              </button>
            )}
            {view.state === "Active" && hasDepositedThisRound && (
              <span className="badge-green">You deposited this round</span>
            )}
            {view.state === "Active" && isSlashed && (
              <span className="badge-red">You were slashed</span>
            )}
            {view.state === "Active" && readyToClose && (
              <button
                type="button"
                onClick={onCloseRound}
                disabled={busyAction !== null}
                className="btn-secondary"
              >
                {busyAction === "close" ? <Spinner size="sm" /> : null}
                {busyAction === "close" ? "Closing..." : "Close round"}
              </button>
            )}
            {view.state === "Complete" && (
              <span className="badge-green">Circle complete</span>
            )}
            {!wallet.isConnected && (
              <span className="text-xs text-slate-500">Connect Freighter to interact.</span>
            )}
          </div>
        </section>

        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">Members</h2>
          {circle.members.length === 0 ? (
            <p className="text-sm text-slate-500">No members yet.</p>
          ) : (
            <MemberRow members={circle.members} view={view} myAddress={wallet.publicKey} />
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Live event feed</h2>
        <EventFeed events={events.filter((e) => {
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
        })} />
      </section>
    </div>
  );
}
