import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { WalletContext, type WalletState } from "./wallet-context";

export type { WalletState } from "./wallet-context";
export { WalletContext } from "./wallet-context";

async function getFreighterApi(): Promise<typeof import("@stellar/freighter-api") | null> {
  try {
    if (typeof window === "undefined") return null;
    return await import("@stellar/freighter-api");
  } catch (e) {
    console.warn("Freighter not available:", e);
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const api = await getFreighterApi();
      if (cancelled) return;
      if (!api) {
        setIsAvailable(false);
        return;
      }
      try {
        const connected = await api.isConnected();
        if (!cancelled) setIsAvailable(!!connected);
      } catch {
        if (!cancelled) setIsAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (): Promise<string> => {
    const api = await getFreighterApi();
    if (!api) {
      throw new Error("Freighter wallet not detected. Install the Freighter extension to continue.");
    }
    const pk = await api.requestAccess();
    if (!pk) {
      throw new Error("Freighter returned an empty public key.");
    }
    setPublicKey(pk);
    setIsConnected(true);
    return pk;
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase: string): Promise<string> => {
      const api = await getFreighterApi();
      if (!api) {
        throw new Error("Freighter wallet not detected.");
      }
      return await api.signTransaction(xdr, {
        networkPassphrase,
      });
    },
    []
  );

  const value = useMemo<WalletState>(
    () => ({ isAvailable, isConnected, publicKey, connect, disconnect, signTransaction }),
    [isAvailable, isConnected, publicKey, connect, disconnect, signTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
