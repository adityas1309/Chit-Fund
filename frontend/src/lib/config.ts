
// Network configuration. The app is hard-locked to Stellar testnet.

export type NetworkType = "testnet" | "public";

export interface NetworkConfig {
  network: NetworkType;
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  friendbotUrl?: string;
  label: string;
  explorerBase: string;
}

const TESTNET: NetworkConfig = {
  network: "testnet",
  label: "Testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  horizonUrl: "https://horizon-testnet.stellar.org",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  friendbotUrl: "https://friendbot.stellar.org",
  explorerBase: "https://stellar.expert/explorer/testnet",
};

// Always testnet for this deployment.
export const NETWORK: NetworkConfig = TESTNET;

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
