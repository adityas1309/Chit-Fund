import { createContext } from "react";
import type { NetworkConfig } from "./config";
import type { WalletKind } from "./wallets";
import type { XlmBalance } from "./balance";

export interface WalletState {
  isAvailable: boolean;
  isConnected: boolean;
  publicKey: string | null;
  address: string | null;
  network: NetworkConfig;
  networkMismatch: boolean;
  walletKind: WalletKind | null;
  balance: XlmBalance | null;
  balanceLoading: boolean;
  balanceError: string | null;
  connect: (preferred?: WalletKind) => Promise<string>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>;
}

export const WalletContext = createContext<WalletState | null>(null);
