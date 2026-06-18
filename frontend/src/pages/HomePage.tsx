import { Link } from "react-router-dom";
import { isConfigured } from "../lib/config";

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <span className="badge-amber">Soroban / Stellar</span>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Rotating savings circles,<br />
            <span className="text-brand-600">on-chain.</span>
          </h1>
          <p className="max-w-prose text-base text-slate-600">
            A trustless Susu / Chit Fund protocol. A group of N members each
            deposit a fixed amount every round. One member wins the pot. After N
            rounds, everyone has been paid out exactly once. Miss a payment and
            your collateral is slashed and redistributed to the rest.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/create" className="btn-primary">Create a circle</Link>
            <Link to="/circles" className="btn-secondary">Browse open circles</Link>
          </div>
        </div>
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">1</span>
              <span>Creator opens a circle with N seats, a deposit amount, and a round interval.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">2</span>
              <span>Members join and lock collateral = 1 round of default coverage.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">3</span>
              <span>Each round, every active member deposits their share.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">4</span>
              <span>After the deadline, anyone can close the round. A winner is selected.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">5</span>
              <span>Defaulters are slashed via the penalty contract; collateral is split among the rest.</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          title="Trustless treasurer"
          body="No group admin holds the funds. The contract is the treasurer. No one can run off with the pot."
          emoji="??"
        />
        <FeatureCard
          title="Skin in the game"
          body="Collateral locked upfront covers one round of default. Honest players earn that back at the end."
          emoji="??"
        />
        <FeatureCard
          title="Public by default"
          body="Anyone can verify the round status, deposits, and slashes on the ledger. No private ledgers, no disputes."
          emoji="??"
        />
      </section>

      {!isConfigured() && (
        <section className="card border-amber-200 bg-amber-50 text-amber-900">
          <h3 className="text-base font-semibold">Demo mode</h3>
          <p className="mt-1 text-sm">
            This deployment is running with no contract IDs configured. You can
            still browse the UI; live on-chain actions are disabled. Set
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_*_CONTRACT_ID</code>
            in <code className="font-mono text-xs">frontend/.env</code> to enable them.
          </p>
        </section>
      )}
    </div>
  );
}

function FeatureCard({ title, body, emoji }: { title: string; body: string; emoji: string }) {
  return (
    <div className="card">
      <div className="text-2xl" aria-hidden>{emoji}</div>
      <h3 className="mt-2 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
