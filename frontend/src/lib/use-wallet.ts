import { useContext } from "react";
import { WalletContext, type WalletState } from "./wallet-context";

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used inside a <WalletProvider>");
  }
  return ctx;
}
