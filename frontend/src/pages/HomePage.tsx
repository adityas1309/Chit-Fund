import { Link } from "react-router-dom";
import { isConfigured } from "../lib/config";
import { useWallet } from "../lib/use-wallet";

export function HomePage() {
  const wallet = useWallet();
  return (
    <div className="space-y-20">
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-12 -z-10 mx-auto h-72 max-w-3xl bg-halo" />
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-700 shadow-soft ring-1 ring-ink-200/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="font-mono uppercase tracking-wider text-[10px]">Stellar · Soroban</span>
              <span className="text-ink-300">|</span>
              <span className="text-ink-500">Testnet deployment</span>
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.04] tracking-tight text-ink-900 sm:text-6xl lg:text-7xl">
              The savings circle, <br className="hidden sm:block" />
              <span className="italic text-amber-600">finally</span> on-chain.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ink-600">
              A rotating Susu, Chit Fund, or Tanda — ported to Stellar / Soroban.
              Lock collateral, deposit each round, and let the contract pick the winner.
              No organizer, no trust, no missing pot.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/create" className="btn-amber">
                Start a circle
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M3 10a.75.75 0 0 1 .75-.75h10.69L11.22 6.03a.75.75 0 0 1 1.06-1.06l4.5 4.5c.3.3.3.77 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H3.75A.75.75 0 0 1 3 10Z" />
                </svg>
              </Link>
              <Link to="/circles" className="btn-secondary">Browse open circles</Link>
              {!wallet.isConnected && (
                <span className="ml-1 text-xs text-ink-500">
                  You'll need the Freighter browser extension.
                </span>
              )}
            </div>
            <dl className="grid max-w-xl grid-cols-3 gap-x-6 gap-y-2 pt-4 text-sm">
              <Stat label="Collateral" value="Locked upfront" />
              <Stat label="Default" value="Auto-slashed" />
              <Stat label="Auditing" value="Public ledger" />
            </dl>
          </div>
          <div className="lg:col-span-5">
            <CircleDiagram />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="How it works" title="Five steps from empty pot to paid out." />
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { n: 1, t: "Create", d: "Set the seat count, deposit, and round interval." },
            { n: 2, t: "Join", d: "Members lock one round of collateral to participate." },
            { n: 3, t: "Deposit", d: "Each member contributes the deposit every round." },
            { n: 4, t: "Close", d: "After the deadline, anyone closes the round on-chain." },
            { n: 5, t: "Payout", d: "Winner gets the pot. Defaulters get slashed." },
          ].map((s) => (
            <li key={s.n} className="card flex h-full flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-900 text-[11px] font-bold text-ink-50">
                  {s.n}
                </span>
                <span className="text-sm font-semibold text-ink-900">{s.t}</span>
              </div>
              <p className="text-sm leading-relaxed text-ink-500">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionHeader eyebrow="What you get" title="A treasurer that never sleeps." />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Trustless treasurer"
            body="The contract holds the pot. There's no one to lose it, and no one to convince you they didn't."
            metric="0 custodians"
          />
          <FeatureCard
            title="Skin in the game"
            body="Collateral is locked up front, and a generic penalty contract redistributes it on default."
            metric="1 round of cover"
          />
          <FeatureCard
            title="Public by default"
            body="Every deposit, every slash, every winner is on the ledger. Anyone can verify, anytime."
            metric="100% transparent"
          />
        </div>
      </section>

      {!isConfigured() && (
        <section className="card border-amber-200 bg-amber-50 text-amber-900">
          <h3 className="text-base font-semibold">Demo mode</h3>
          <p className="mt-1 text-sm leading-relaxed">
            This deployment is running without contract IDs. The UI still works,
            but live on-chain actions are disabled. Set
            <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_*_CONTRACT_ID</code>
            in <code className="font-mono text-xs">frontend/.env</code> to enable them.
          </p>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">{title}</h2>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink-800">{value}</dd>
    </div>
  );
}

function FeatureCard({ title, body, metric }: { title: string; body: string; metric: string }) {
  return (
    <div className="card flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        <span className="rounded-full bg-ink-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-600 ring-1 ring-ink-200">
          {metric}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}

function CircleDiagram() {
  const seats = Array.from({ length: 8 });
  return (
    <div className="relative aspect-square w-full max-w-md mx-auto">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ink-50 to-white shadow-card ring-1 ring-ink-200/70" />
      <div className="absolute inset-6 rounded-full bg-white ring-1 ring-ink-200/70" />
      <div className="absolute inset-12 rounded-full bg-ink-900 ring-1 ring-ink-900 shadow-soft" />
      <div className="absolute inset-0 grid place-items-center text-center text-ink-50">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">Pot</p>
          <p className="mt-1 font-display text-3xl font-semibold">N × D</p>
          <p className="mt-1 text-[11px] text-ink-300">one winner per round</p>
        </div>
      </div>
      {seats.map((_, i) => {
        const angle = (i / seats.length) * 2 * Math.PI - Math.PI / 2;
        const radius = 44;
        const x = 50 + Math.cos(angle) * radius;
        const y = 50 + Math.sin(angle) * radius;
        const filled = i < 6;
        return (
          <div
            key={i}
            className={
              "absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-white " +
              (filled ? "bg-leaf-500 text-white" : "bg-white text-ink-500 ring-ink-200")
            }
            style={{ left: x + "%", top: y + "%" }}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}