import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../lib/use-wallet";
import { useToast } from "../lib/use-toast";
import { isConfigured, CIRCLE_TOKEN_CONTRACT_ID, SAVINGS_CIRCLE_CONTRACT_ID } from "../lib/config";
import { createCircle, approveToken, type SelectionMode } from "../lib/contract";
import { Spinner } from "../components/Spinner";

const STROOPS_PER_XLM = 10_000_000;

export function CreateCirclePage() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const { show } = useToast();
  const [maxMembers, setMaxMembers] = useState("4");
  const [depositXlm, setDepositXlm] = useState("5");
  const [roundInterval, setRoundInterval] = useState("60");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("RoundRobin");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>("");

  const ready = isConfigured() && wallet.isConnected && wallet.publicKey !== null;

  const parsed = useMemo(() => {
    const n = parseInt(maxMembers, 10);
    const dep = parseFloat(depositXlm);
    const ri = parseInt(roundInterval, 10);
    return {
      n: Number.isFinite(n) ? n : 0,
      dep: Number.isFinite(dep) ? dep : 0,
      ri: Number.isFinite(ri) ? ri : 0,
    };
  }, [maxMembers, depositXlm, roundInterval]);

  const potAtFullHouse = parsed.n * parsed.dep;
  const minutesPerRound = Math.max(1, Math.round((parsed.ri * 5) / 60));
  const totalDurationMin = parsed.n * minutesPerRound;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey) {
      show("warning", "Connect your Freighter wallet first.");
      return;
    }
    if (!isConfigured()) {
      show("warning", "Contracts not configured. Set VITE_* env vars to deploy.");
      return;
    }
    if (parsed.n < 2) { show("error", "Max members must be at least 2."); return; }
    if (parsed.n > 50) { show("error", "Max members capped at 50."); return; }
    if (parsed.dep <= 0) { show("error", "Deposit amount must be > 0."); return; }
    if (parsed.ri < 1) { show("error", "Round interval must be at least 1 ledger."); return; }

    setBusy(true);
    try {
      const depositStroops = Math.round(parsed.dep * STROOPS_PER_XLM);
      const collateralStroops = depositStroops;

      setStep("Approving token spend…");
      const approveHash = await approveToken(wallet, {
        owner: wallet.publicKey,
        spender: SAVINGS_CIRCLE_CONTRACT_ID,
        amount: collateralStroops,
        token: CIRCLE_TOKEN_CONTRACT_ID,
      });
      show("info", "Approve tx: " + approveHash.slice(0, 8) + "…");

      setStep("Creating circle…");
      const hash = await createCircle(wallet, {
        creator: wallet.publicKey,
        token: CIRCLE_TOKEN_CONTRACT_ID,
        depositAmount: depositStroops,
        maxMembers: parsed.n,
        roundIntervalLedgers: parsed.ri,
        selectionMode,
      });
      show("success", "Circle created · tx " + hash.slice(0, 8) + "…");
      navigate("/circles");
    } catch (e) {
      show("error", "Create failed: " + (e as Error).message);
    } finally {
      setBusy(false);
      setStep("");
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">New circle</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink-900">Set up a savings circle</h1>
        <p className="mt-2 text-sm text-ink-500">Pick the parameters, fund your collateral, and invite members.</p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-5 lg:col-span-2">
          <Field
            label="Members"
            htmlFor="maxMembers"
            hint="How many people will sit in the circle (including you). 2–50."
          >
            <input
              id="maxMembers"
              type="number"
              min={2}
              max={50}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              className="input tabular-nums"
              required
            />
          </Field>

          <Field
            label="Deposit per round"
            htmlFor="deposit"
            hint="Each member contributes this much every round. The pot is N × deposit."
            suffix="XLM"
          >
            <input
              id="deposit"
              type="number"
              min={0.0000001}
              step="0.0000001"
              value={depositXlm}
              onChange={(e) => setDepositXlm(e.target.value)}
              className="input tabular-nums"
              required
            />
          </Field>

          <Field
            label="Round interval"
            htmlFor="interval"
            hint="Ledgers between rounds. ~5 seconds per ledger on Stellar testnet."
            suffix="ledgers"
          >
            <input
              id="interval"
              type="number"
              min={1}
              value={roundInterval}
              onChange={(e) => setRoundInterval(e.target.value)}
              className="input tabular-nums"
              required
            />
          </Field>

          <fieldset>
            <legend className="label">Winner selection</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SelectionCard
                value="RoundRobin"
                current={selectionMode}
                onChange={setSelectionMode}
                title="Round-robin"
                body="Members win in the order they joined. Predictable and fair."
              />
              <SelectionCard
                value="Random"
                current={selectionMode}
                onChange={setSelectionMode}
                title="Random"
                body="Pseudo-random per round. Fun, but not verifiably fair."
              />
            </div>
          </fieldset>
        </div>

        <aside className="space-y-4">
          <div className="card space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Summary</p>
            <SummaryRow label="Deposit" value={`${parsed.dep.toLocaleString()} XLM`} />
            <SummaryRow label="Members" value={parsed.n > 0 ? parsed.n.toString() : "—"} />
            <SummaryRow label="Round length" value={`~${minutesPerRound} min`} />
            <SummaryRow label="Total run" value={parsed.n > 0 ? `~${totalDurationMin} min` : "—"} />
            <div className="divider-soft" />
            <div className="rounded-xl bg-ink-900 p-4 text-ink-50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Pot at full house</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">
                {potAtFullHouse > 0 ? potAtFullHouse.toLocaleString() : "—"} <span className="text-base text-ink-300">XLM</span>
              </p>
              <p className="mt-1 text-[11px] text-ink-300">Winner takes the full pot each round.</p>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
            The contract will pull
            {" "}<span className="font-mono font-semibold">{parsed.dep.toLocaleString() || 0} XLM</span> of
            collateral from your wallet when you join, plus a one-time approve. Make sure you're funded.
          </div>
          <button
            type="submit"
            disabled={!ready || busy}
            className="btn-amber w-full"
          >
            {busy ? (
              <>
                <Spinner size="sm" tone="white" /> {step || "Working…"}
              </>
            ) : ready ? "Create circle" : !wallet.isConnected ? "Connect wallet to continue" : "Contracts not configured"}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, hint, htmlFor, children, suffix }: { label: string; hint?: string; htmlFor: string; children: React.ReactNode; suffix?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label flex items-center justify-between">
        <span>{label}</span>
        {suffix && <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{suffix}</span>}
      </label>
      {children}
      {hint && <p className="help">{hint}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="font-mono tabular-nums font-medium text-ink-800">{value}</span>
    </div>
  );
}

function SelectionCard({ value, current, onChange, title, body }: { value: SelectionMode; current: SelectionMode; onChange: (v: SelectionMode) => void; title: string; body: string }) {
  const active = value === current;
  return (
    <label
      className={
        "cursor-pointer rounded-xl p-3.5 ring-1 transition-all " +
        (active
          ? "bg-ink-900 text-ink-50 ring-ink-900 shadow-soft"
          : "bg-white text-ink-800 ring-ink-200 hover:ring-ink-400")
      }
    >
      <div className="flex items-center gap-2">
        <input
          type="radio"
          name="selection"
          value={value}
          checked={active}
          onChange={() => onChange(value)}
          className={"h-4 w-4 border-ink-300 " + (active ? "text-amber-400" : "text-ink-700")}
        />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className={"mt-1.5 pl-6 text-xs leading-relaxed " + (active ? "text-ink-200" : "text-ink-500")}>{body}</p>
    </label>
  );
}