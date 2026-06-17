import { createContext } from "react";

export interface WalletState {
  isAvailable: boolean;
  isConnected: boolean;
  publicKey: string | null;
  connect: () => Promise<string>;
  disconnect: () => void;
  signTransaction: (xdr: string, networkPassphrase: string) => Promise<string>;
}

export const WalletContext = createContext<WalletState | null>(null);
