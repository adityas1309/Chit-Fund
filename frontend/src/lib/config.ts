// Network configuration. In a production deployment these would be set via
// the Vercel (or other) deployment environment.

export type NetworkType = "testnet" | "public";

export interface NetworkConfig {
  network: NetworkType;
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  friendbotUrl?: string;
}

const TESTNET: NetworkConfig = {
  network: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  friendbotUrl: "https://friendbot.stellar.org",
};

const PUBLIC: NetworkConfig = {
  network: "public",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  horizonUrl: "https://horizon.stellar.org",
  sorobanRpcUrl: "https://soroban-rpc.stellar.org",
};

export const NETWORK: NetworkConfig =
  (import.meta.env.VITE_NETWORK as NetworkType) === "public" ? PUBLIC : TESTNET;

// Contract addresses are wired in at deploy time. If unset, the UI shows a
// helpful warning and most actions are disabled.
export const SAVINGS_CIRCLE_CONTRACT_ID: string =
  import.meta.env.VITE_SAVINGS_CIRCLE_CONTRACT_ID ?? "";

export const PENALTY_HANDLER_CONTRACT_ID: string =
  import.meta.env.VITE_PENALTY_HANDLER_CONTRACT_ID ?? "";

export const CIRCLE_TOKEN_CONTRACT_ID: string =
  import.meta.env.VITE_CIRCLE_TOKEN_CONTRACT_ID ?? "";

export function isConfigured(): boolean {
  return (
    SAVINGS_CIRCLE_CONTRACT_ID.length > 0 &&
    PENALTY_HANDLER_CONTRACT_ID.length > 0 &&
    CIRCLE_TOKEN_CONTRACT_ID.length > 0
  );
}
