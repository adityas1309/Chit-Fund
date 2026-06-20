
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { WalletContext, type WalletState } from "./wallet-context";
import { NETWORK } from "./config";

export type { WalletState } from "./wallet-context";
export { WalletContext } from "./wallet-context";

type FreighterApi = typeof import("@stellar/freighter-api");

async function loadFreighter(): Promise<FreighterApi | null> {
  if (typeof window === "undefined") return null;
  try {
    return await import("@stellar/freighter-api");
  } catch {
    return null;
  }
}

function isAllowedNetwork(network: string | undefined): boolean {
  if (!network) return true;
  const n = network.toLowerCase();
  return n.includes("test") || n.includes("testnet");
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [networkMismatch, setNetworkMismatch] = useState(false);

  // Detect Freighter on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const api = await loadFreighter();
      if (cancelled || !api) {
        setIsAvailable(false);
        return;
      }
      setIsAvailable(true);

      // Check connection status.
      try {
        const connected = await api.isConnected();
        if (cancelled) return;
        if (connected) {
          const allowed = await api.isAllowed();
          if (allowed) {
            try {
              const pk = await api.getPublicKey();
              if (!cancelled && pk) {
                setPublicKey(pk);
                setAddress(pk);
                setIsConnected(true);
              }
            } catch {
              // user must grant
            }
          }
        }
      } catch {
        // ignore
      }

      // Verify network is testnet.
      try {
        const net = await api.getNetwork();
        if (!cancelled) {
          setNetworkMismatch(!isAllowedNetwork(net ?? undefined));
        }
      } catch {
        setNetworkMismatch(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (): Promise<string> => {
    const api = await loadFreighter();
    if (!api) {
      throw new Error("Freighter wallet not detected. Install the extension to continue.");
    }
    const pk = await api.requestAccess();
    if (!pk) {
      throw new Error("Freighter returned an empty public key.");
    }
    // Verify network before allowing interaction.
    try {
      const net = await api.getNetwork();
      setNetworkMismatch(!isAllowedNetwork(net ?? undefined));
    } catch {
      setNetworkMismatch(false);
    }
    setPublicKey(pk);
    setAddress(pk);
    setIsConnected(true);
    return pk;
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setAddress(null);
    setIsConnected(false);
  }, []);

  const signTransaction = useCallback(
    async (xdr: string, _networkPassphrase: string): Promise<string> => {
      // Always sign against the testnet passphrase; this deployment is testnet-only.
      const api = await loadFreighter();
      if (!api) {
        throw new Error("Freighter wallet not detected.");
      }
      return await api.signTransaction(xdr, {
        networkPassphrase: NETWORK.networkPassphrase,
      });
    },
    []
  );

  const value = useMemo<WalletState>(
    () => ({
      isAvailable,
      isConnected,
      publicKey,
      address,
      network: NETWORK,
      networkMismatch,
      connect,
      disconnect,
      signTransaction,
    }),
    [isAvailable, isConnected, publicKey, address, networkMismatch, connect, disconnect, signTransaction]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
