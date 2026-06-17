import { useState } from "react";
import { useWallet } from "../lib/use-wallet";
import { useToast } from "../lib/use-toast";
import { isConfigured } from "../lib/config";

function truncate(pk: string, head = 4, tail = 4): string {
  if (pk.length <= head + tail + 1) return pk;
  return pk.slice(0, head) + ".." + pk.slice(-tail);
}

export function ConnectButton() {
  const wallet = useWallet();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (wallet.isConnected) {
      wallet.disconnect();
      return;
    }
    if (!wallet.isAvailable) {
      show("warning", "Freighter wallet not detected. Install the extension to continue.");
      return;
    }
    setBusy(true);
    try {
      const pk = await wallet.connect();
      show("success", "Connected: " + truncate(pk));
    } catch (e) {
      show("error", "Failed to connect: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const label = !isConfigured()
    ? "Demo"
    : wallet.isConnected && wallet.publicKey
    ? truncate(wallet.publicKey)
    : busy
    ? "Connecting..."
    : wallet.isAvailable
    ? "Connect"
    : "Install Freighter";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
    >
      <span
        aria-hidden
        className={"inline-block h-2 w-2 rounded-full " + (wallet.isConnected ? "bg-green-300" : "bg-white/60")}
      />
      {label}
    </button>
  );
}
