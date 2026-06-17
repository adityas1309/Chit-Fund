/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK?: "testnet" | "public";
  readonly VITE_SAVINGS_CIRCLE_CONTRACT_ID?: string;
  readonly VITE_PENALTY_HANDLER_CONTRACT_ID?: string;
  readonly VITE_CIRCLE_TOKEN_CONTRACT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
