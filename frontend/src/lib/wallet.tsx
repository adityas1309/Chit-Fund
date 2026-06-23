import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { WalletContext, type WalletState } from "./wallet-context";
import { NETWORK } from "./config";
import { ALL_WALLETS, WALLETS, type WalletAdapter, type WalletKind } from "./wallets";
import { fetchXlmBalance, type XlmBalance } from "./balance";
import { asSusuError, SusuError } from "./errors";

export type { WalletState } from "./wallet-context";
export { WalletContext } from "./wallet-context";

function isAllowedNetwork(network: string | undefined): boolean {
  if (!network) return true;
  const n = network.toLowerCase();
  return n.includes("test") || n.includes("testnet");
}

async function pickAdapter(preferred?: WalletKind): Promise<WalletAdapter> {
  // Try the user's preferred wallet first, then fall back to whatever
  // is installed. Albedo and Rabet are detected via window globals.
  const order: WalletAdapter[] = [];
  if (preferred) order.push(WALLETS[preferred]);
  for (const w of ALL_WALLETS) {
    if (!order.find((o) => o.kind === w.kind)) order.push(w);
  }
  for (const w of order) {
    try {
      if (await w.isAvailable()) return w;
    } catch {
      // ignore
    }
  }
  throw new SusuError("WALLET_NOT_FOUND", "No Stellar wallet detected. Install Freighter, Albedo, or Rabet.");
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null);
  const [activeAdapter, setActiveAdapter] = useState<WalletAdapter | null>(null);
  const [balance, setBalance] = useState<XlmBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Detect any installed wallet on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const present: { kind: WalletKind; adapter: WalletAdapter }[] = [];
      for (const w of ALL_WALLETS) {
        try {
          if (await w.isAvailable()) present.push({ kind: w.kind, adapter: w });
        } catch {
          // ignore
        }
      }
      if (cancelled) return;
      setIsAvailable(present.length > 0);
      if (present.length === 0) return;

      // Try to auto-reconnect with the first installed wallet.
      const first = present[0];
      try {
        if (first.adapter.isAllowed) {
          const allowed = await first.adapter.isAllowed();
          if (allowed) {
            const pk = await first.adapter.getPublicKey();
            if (!cancelled && pk) {
              setWalletKind(first.kind);
              setActiveAdapter(first.adapter);
              setPublicKey(pk);
              setAddress(pk);
              setIsConnected(true);
            }
          }
        }
      } catch {
        // user has not granted access; that's fine
      }

      // Verify network.
      if (first.adapter.getNetwork) {
        try {
          const net = await first.adapter.getNetwork();
          if (!cancelled) setNetworkMismatch(!isAllowedNetwork(net ?? undefined));
        } catch {
          // Albedo does not implement getNetwork; assume testnet.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh XLM balance whenever the connected address changes.
  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      setBalanceError(null);
      return;
    }
    const ctrl = new AbortController();
    setBalanceLoading(true);
    setBalanceError(null);
    (async () => {
      try {
        const b = await fetchXlmBalance(publicKey, ctrl.signal);
        if (!ctrl.signal.aborted) setBalance(b);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          const err = asSusuError(e, "HORIZON_UNAVAILABLE");
          setBalanceError(err.message);
        }
      } finally {
        if (!ctrl.signal.aborted) setBalanceLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [publicKey]);

  const connect = useCallback(async (preferred?: WalletKind): Promise<string> => {
    const adapter = await pickAdapter(preferred);
    let pk: string;
    try {
      pk = await adapter.requestAccess();
    } catch (e) {
      throw asSusuError(e, "WALLET_USER_REJECTED");
    }
    if (!pk) {
      throw new SusuError("WALLET_USER_REJECTED", "Wallet returned an empty public key");
    }
    if (adapter.getNetwork) {
      try {
        const net = await adapter.getNetwork();
        setNetworkMismatch(!isAllowedNetwork(net ?? undefined));
      } catch {
        setNetworkMismatch(false);
      }
    } else {
      setNetworkMismatch(false);
    }
    setWalletKind(adapter.kind);
    setActiveAdapter(adapter);
    setPublicKey(pk);
    setAddress(pk);
    setIsConnected(true);
    return pk;
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setAddress(null);
    setIsConnected(false);
    setWalletKind(null);
    setActiveAdapter(null);
    setBalance(null);
    setBalanceError(null);
  }, []);

  const refreshBalance = useCallback(async (): Promise<void> => {
    if (!publicKey) return;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const b = await fetchXlmBalance(publicKey);
      setBalance(b);
    } catch (e) {
      setBalanceError(asSusuError(e, "HORIZON_UNAVAILABLE").message);
    } finally {
      setBalanceLoading(false);
    }
  }, [publicKey]);

  const signTransaction = useCallback(
    async (xdr: string, _networkPassphrase: string): Promise<string> => {
      if (!activeAdapter) {
        throw new SusuError("WALLET_NOT_FOUND", "No wallet connected");
      }
      try {
        return await activeAdapter.signTransaction(xdr, NETWORK.networkPassphrase);
      } catch (e) {
        throw asSusuError(e, "WALLET_USER_REJECTED");
      }
    },
    [activeAdapter]
  );

  const value = useMemo<WalletState>(
    () => ({
      isAvailable,
      isConnected,
      publicKey,
      address,
      network: NETWORK,
      networkMismatch,
      walletKind,
      balance,
      balanceLoading,
      balanceError,
      connect,
      disconnect,
      refreshBalance,
      signTransaction,
    }),
    [
      isAvailable,
      isConnected,
      publicKey,
      address,
      networkMismatch,
      walletKind,
      balance,
      balanceLoading,
      balanceError,
      connect,
      disconnect,
      refreshBalance,
      signTransaction,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
