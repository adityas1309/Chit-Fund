import { Link } from "react-router-dom";
import { useState } from "react";
import { useOpenCircles } from "../hooks/useOpenCircles";
import { useLiveEvents } from "../hooks/useLiveEvents";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { EventFeed } from "../components/EventFeed";
import { isConfigured, NETWORK } from "../lib/config";

function fmt(amount: number): string {
  return (amount / 10_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 }) + " XLM";
}

export function BrowseCirclesPage() {
  const { views, loading, error, refresh } = useOpenCircles();
  const { events, connected } = useLiveEvents();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const totalSeats = views.reduce((s, v) => s + Number(v.max_members), 0);
  const takenSeats = views.reduce((s, v) => s + Number(v.member_count), 0);
  const totalPot = views.reduce((s, v) => s + Number(v.deposit_amount) * Number(v.max_members), 0);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Marketplace</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900">Open circles</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-500">
            Browse every open savings circle on the {NETWORK.label} network and join one with a single click.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="btn-secondary"
          disabled={refreshing}
        >
          {refreshing ? <Spinner size="sm" /> : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10 3a7 7 0 0 1 6.32 4H14a1 1 0 1 0 0 2h4a1 1 0 0 0 1-1V4a1 1 0 1 0-2 0v1.07A9 9 0 0 0 1 10a1 1 0 1 0 2 0 7 7 0 0 1 7-7Zm0 14a7 7 0 0 1-6.32-4H6a1 1 0 1 0 0-2H2a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0v-1.07A9 9 0 0 0 19 10a1 1 0 1 0-2 0 7 7 0 0 1-7 7Z" />
            </svg>
          )}
          Refresh
        </button>
      </header>

      {isConfigured() && views.length > 0 && (
        <dl className="grid grid-cols-3 gap-3">
          <StatTile label="Open circles" value={views.length.toString()} />
          <StatTile label="Seats filled" value={`${takenSeats} / ${totalSeats}`} />
          <StatTile label="Combined pot" value={fmt(totalPot)} />
        </dl>
      )}

      {!isConfigured() && (
        <EmptyState
          title="Contracts not deployed"
          description="Once the contract IDs are configured in VITE_*, this page will list every open savings circle on the network."
          actionLabel="Learn more"
          actionTo="/"
        />
      )}

      {isConfigured() && loading && (
        <div className="card flex items-center justify-center py-16">
          <Spinner label="Loading circles…" />
        </div>
      )}

      {isConfigured() && error && (
        <div className="card border-rust-200 bg-rust-50 text-sm text-rust-700">
          Failed to load: {error}
        </div>
      )}

      {isConfigured() && !loading && views.length === 0 && (
        <EmptyState
          title="No open circles yet"
          description="Be the first to start one. Set the seat count, deposit, and round interval."
          actionLabel="Create a circle"
          actionTo="/create"
        />
      )}
      {isConfigured() && views.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {views.map((v) => {
            const pct = v.max_members > 0 ? Number(v.member_count) / Number(v.max_members) * 100 : 0;
            return (
              <li key={v.id} className="card-lift flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-ink-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-600 ring-1 ring-ink-200">
                    Circle #{v.id}
                  </span>
                  <span className={v.state === "Open" ? "badge-green" : "badge-amber"}>
                    <span className={"h-1.5 w-1.5 rounded-full " + (v.state === "Open" ? "bg-leaf-500" : "bg-amber-500")} />
                    {v.state}
                  </span>
                </div>
                <div>
                  <div className="font-display text-2xl font-semibold tabular-nums text-ink-900">
                    {fmt(v.deposit_amount)}
                    <span className="text-sm font-normal text-ink-500"> / round</span>
                  </div>
                  <div className="mt-1 text-xs text-ink-500">
                    Pot at full house · <span className="font-mono text-ink-700">{fmt(Number(v.deposit_amount) * Number(v.max_members))}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-500">
                  <div>
                    <p className="font-mono uppercase tracking-wider text-ink-400">Seats</p>
                    <p className="mt-0.5 font-mono text-sm text-ink-800">{v.member_count} / {v.max_members}</p>
                  </div>
                  <div>
                    <p className="font-mono uppercase tracking-wider text-ink-400">Mode</p>
                    <p className="mt-0.5 text-sm text-ink-800">{v.selection_mode}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-mono uppercase tracking-wider text-ink-400">Round</p>
                    <p className="mt-0.5 text-sm text-ink-800">~{v.round_interval_ledgers} ledgers · ~{Math.round(v.round_interval_ledgers * 5 / 60)} min</p>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-ink-500">
                    <span>Seats taken</span>
                    <span className="font-mono">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ink-700 to-ink-900"
                      style={{ width: pct + "%" }}
                    />
                  </div>
                </div>
                <Link to={"/circles/" + v.id} className="btn-primary mt-auto">
                  Open circle
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3 10a.75.75 0 0 1 .75-.75h10.69L11.22 6.03a.75.75 0 0 1 1.06-1.06l4.5 4.5c.3.3.3.77 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H3.75A.75.75 0 0 1 3 10Z" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

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
        <EventFeed events={events} />
        <p className="mt-2 text-[11px] uppercase tracking-wider text-ink-400">
          Subscribed via Horizon SSE · {NETWORK.label}
        </p>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-soft ring-1 ring-ink-200/70">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}