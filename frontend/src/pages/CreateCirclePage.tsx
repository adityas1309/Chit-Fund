import { useState, FormEvent } from "react";
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
    const n = parseInt(maxMembers, 10);
    const dep = parseFloat(depositXlm);
    const ri = parseInt(roundInterval, 10);
    if (!Number.isFinite(n) || n < 2) {
      show("error", "Max members must be at least 2.");
      return;
    }
    if (!Number.isFinite(dep) || dep <= 0) {
      show("error", "Deposit amount must be > 0.");
      return;
    }
    if (!Number.isFinite(ri) || ri < 1) {
      show("error", "Round interval must be at least 1 ledger.");
      return;
    }
    setBusy(true);
    try {
      const depositStroops = Math.round(dep * STROOPS_PER_XLM);
      setStep("Approving token spend...");
      const approveHash = await approveToken(wallet, {
        owner: wallet.publicKey,
        spender: SAVINGS_CIRCLE_CONTRACT_ID,
        amount: depositStroops,
        token: CIRCLE_TOKEN_CONTRACT_ID,
      });
      show("info", "Approve tx: " + approveHash.slice(0, 8) + "...");

      setStep("Creating circle...");
      const hash = await createCircle(wallet, {
        creator: wallet.publicKey,
        token: CIRCLE_TOKEN_CONTRACT_ID,
        depositAmount: depositStroops,
        maxMembers: n,
        roundIntervalLedgers: ri,
        selectionMode,
      });
      show("success", "Circle created. Tx: " + hash.slice(0, 8) + "...");
      navigate("/circles");
    } catch (e) {
      show("error", "Create failed: " + (e as Error).message);
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Create a circle</h1>
        <p className="text-sm text-slate-500">Set up a new rotating savings group.</p>
      </header>

      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label htmlFor="maxMembers" className="label">Members (N)</label>
          <input
            id="maxMembers"
            type="number"
            min={2}
            max={50}
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            className="input"
            required
          />
          <p className="mt-1 text-xs text-slate-500">How many people will be in the circle (including you).</p>
        </div>

        <div>
          <label htmlFor="deposit" className="label">Deposit per round (XLM)</label>
          <input
            id="deposit"
            type="number"
            min={0.0000001}
            step="0.0000001"
            value={depositXlm}
            onChange={(e) => setDepositXlm(e.target.value)}
            className="input"
            required
          />
          <p className="mt-1 text-xs text-slate-500">Each member contributes this much every round. The pot is N . deposit.</p>
        </div>

        <div>
          <label htmlFor="interval" className="label">Round interval (ledgers)</label>
          <input
            id="interval"
            type="number"
            min={1}
            value={roundInterval}
            onChange={(e) => setRoundInterval(e.target.value)}
            className="input"
            required
          />
          <p className="mt-1 text-xs text-slate-500">~5 seconds per ledger on Stellar testnet.</p>
        </div>

        <fieldset>
          <legend className="label">Winner selection</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SelectionCard
              value="RoundRobin"
              current={selectionMode}
              onChange={setSelectionMode}
              title="Round-robin"
              body="Members win in the order they joined. Predictable."
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

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <strong>Heads up:</strong> the contract will pull
          {" "}<span className="font-mono">{depositXlm || "0"}</span> XLM of
          collateral from you on join, plus a one-time approve. Make sure your
          wallet is funded.
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!ready || busy}
            className="btn-primary"
          >
            {busy ? (
              <>
                <Spinner size="sm" /> {step || "Working..."}
              </>
            ) : ready ? "Create circle" : "Connect wallet to continue"}
          </button>
          {!ready && (
            <span className="text-xs text-slate-500">
              {!isConfigured() ? "Demo mode - set VITE_* env vars" : "Connect Freighter to enable"}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function SelectionCard({ value, current, onChange, title, body }: { value: SelectionMode; current: SelectionMode; onChange: (v: SelectionMode) => void; title: string; body: string }) {
  const active = value === current;
  return (
    <label
      className={"cursor-pointer rounded-lg p-3 ring-1 transition-colors " + (active ? "bg-brand-50 ring-brand-300" : "bg-white ring-slate-200 hover:bg-slate-50")}
    >
      <div className="flex items-center gap-2">
        <input
          type="radio"
          name="selection"
          value={value}
          checked={active}
          onChange={() => onChange(value)}
          className="h-4 w-4 text-brand-600"
        />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1 pl-6 text-xs text-slate-500">{body}</p>
    </label>
  );
}
