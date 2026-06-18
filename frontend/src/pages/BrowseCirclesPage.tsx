import { Link } from "react-router-dom";
import { useOpenCircles } from "../hooks/useOpenCircles";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { EventFeed } from "../components/EventFeed";
import { isConfigured } from "../lib/config";
import { useState } from "react";

function fmt(amount: number): string {
  return (amount / 10_000_000).toFixed(2) + " XLM";
}

export function BrowseCirclesPage() {
  const { ids, views, loading, error, refresh } = useOpenCircles();
  const { events, connected } = useLiveEvents();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Open circles</h1>
          <p className="text-sm text-slate-500">Join a savings circle with one click.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="btn-secondary"
          disabled={refreshing}
        >
          {refreshing ? <Spinner size="sm" /> : "Refresh"}
        </button>
      </header>

      {!isConfigured() && (
        <EmptyState
          title="Contracts not deployed"
          description="Once the contract IDs are configured in VITE_*, this page will list all open circles on the network."
          actionLabel="Learn more"
          actionTo="/"
          emoji="??"
        />
      )}

      {isConfigured() && loading && (
        <div className="card flex items-center justify-center">
          <Spinner label="Loading circles..." />
        </div>
      )}

      {isConfigured() && error && (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700">
          Failed to load: {error}
        </div>
      )}

      {isConfigured() && !loading && views.length === 0 && (
        <EmptyState
          title="No open circles"
          description="Be the first to start one."
          actionLabel="Create a circle"
          actionTo="/create"
          emoji="??"
        />
      )}

      {isConfigured() && views.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {views.map((v) => (
            <li key={v.id} className="card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500">#{v.id}</span>
                <span className={v.state === "Open" ? "badge-green" : "badge-amber"}>{v.state}</span>
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {fmt(v.deposit_amount)} <span className="text-sm text-slate-500">/ round</span>
              </div>
              <div className="text-xs text-slate-500">
                {v.member_count} / {v.max_members} seats . {v.selection_mode} . ~{v.round_interval_ledgers} ledgers/round
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: ((v.member_count / v.max_members) * 100) + "%" }}
                />
              </div>
              <Link to={"/circles/" + v.id} className="btn-primary mt-2">
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Live event feed</h2>
          <span className={connected ? "badge-green" : "badge-slate"}>
            {connected ? "Connected" : "Idle"}
          </span>
        </div>
        <EventFeed events={events} />
        <p className="mt-1 text-xs text-slate-400">
          Subscribed to {ids.length} circle(s).
        </p>
      </section>
    </div>
  );
}
