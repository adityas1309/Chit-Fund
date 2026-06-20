
import { createContext } from "react";
import type { NetworkConfig } from "./config";

export interface WalletState {
  isAvailable: boolean;
  isConnected: boolean;
  publicKey: string | null;
  address: string | null;
  network: NetworkConfig;
  networkMismatch: boolean;
  connect: () => Promise<string>;
  disconnect: () => void;
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>;
}

export const WalletContext = createContext<WalletState | null>(null);
