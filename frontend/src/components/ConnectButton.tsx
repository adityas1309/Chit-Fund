import { useEffect, useRef, useState } from "react";
import { useWallet } from "../lib/use-wallet";
import { useToast } from "../lib/use-toast";
import { isConfigured } from "../lib/config";

function truncate(pk: string, head = 4, tail = 4): string {
  if (pk.length <= head + tail + 1) return pk;
  return pk.slice(0, head) + "…" + pk.slice(-tail);
}

export function ConnectButton() {
  const wallet = useWallet();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function onConnect() {
    if (wallet.isConnected) return;
    if (!wallet.isAvailable) {
      window.open("https://www.freighter.app/", "_blank", "noopener,noreferrer");
      show("warning", "Freighter not detected. We opened the install page.");
      return;
    }
    setBusy(true);
    try {
      const pk = await wallet.connect();
      show("success", "Connected · " + truncate(pk));
      setOpen(false);
    } catch (e) {
      show("error", "Failed to connect: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onDisconnect() {
    wallet.disconnect();
    setOpen(false);
    show("info", "Wallet disconnected.");
  }

  if (!wallet.isConnected) {
    const label = !isConfigured()
      ? "Demo"
      : busy
      ? "Connecting…"
      : wallet.isAvailable
      ? "Connect wallet"
      : "Install Freighter";
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-semibold text-ink-50 shadow-soft transition-colors hover:bg-ink-800 disabled:opacity-50"
      >
        {busy ? <Spinner /> : <Dot />}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 shadow-soft ring-1 ring-ink-200 transition hover:bg-ink-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-leaf-500" />
        <span className="font-mono text-[12px]">{truncate(wallet.publicKey ?? "", 5, 5)}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-ink-500">
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl bg-white shadow-lift ring-1 ring-ink-200 animate-fade-up"
        >
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Connected</p>
            <p className="mt-1 break-all font-mono text-xs text-ink-800">{wallet.publicKey}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-leaf-700 ring-1 ring-inset ring-leaf-200">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" /> {wallet.network.label}
            </p>
          </div>
          <div className="p-1">
            <button
              type="button"
              onClick={onDisconnect}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-ink-500">
                <path d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 0 1.5 0v-2A3.75 3.75 0 0 0 10.75.5h-5.5A3.75 3.75 0 0 0 1.5 4.25v11.5A3.75 3.75 0 0 0 5.25 19.5h5.5A3.75 3.75 0 0 0 14.5 15.75v-2a.75.75 0 0 0-1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" />
                <path d="M16.78 9.47a.75.75 0 0 0-1.06 0l-2.47 2.47H7.75a.75.75 0 0 0 0 1.5h5.5l2.47 2.47a.75.75 0 1 0 1.06-1.06l-1.97-1.97 1.97-1.97a.75.75 0 0 0 0-1.06Z" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />;
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z" className="opacity-75" />
    </svg>
  );
}