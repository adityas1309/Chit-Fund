// Multi-wallet adapter layer for the Susu frontend.
//
// The app supports three Stellar testnet wallets: Freighter (browser
// extension), Albedo (web / extension), and Rabet (browser extension).
// We expose a single `WalletAdapter` interface so the rest of the app
// does not have to know which provider is plugged in.
//
// All adapters are optional: if a wallet is not installed the
// `WalletProvider` falls back to Freighter and surfaces an actionable
// "install" prompt.

import { NETWORK } from "./config";
import { SusuError } from "./errors";

export type WalletKind = "freighter" | "albedo" | "rabet";

export interface WalletAdapter {
  kind: WalletKind;
  label: string;
  installUrl: string;
  isAvailable(): Promise<boolean>;
  getPublicKey(): Promise<string>;
  isAllowed?(): Promise<boolean>;
  requestAccess(): Promise<string>;
  getNetwork?(): Promise<string>;
  signTransaction(xdr: string, networkPassphrase: string): Promise<string>;
}

type FreighterApi = typeof import("@stellar/freighter-api");

async function loadFreighter(): Promise<FreighterApi | null> {
  if (typeof window === "undefined") return null;
  try {
    return await import("@stellar/freighter-api");
  } catch {
    return null;
  }
}

const freighterAdapter: WalletAdapter = {
  kind: "freighter",
  label: "Freighter",
  installUrl: "https://www.freighter.app/",
  async isAvailable() {
    const api = await loadFreighter();
    if (!api) return false;
    try {
      return Boolean(await api.isConnected());
    } catch {
      return false;
    }
  },
  async getPublicKey() {
    const api = await loadFreighter();
    if (!api) throw new SusuError("WALLET_NOT_FOUND", "Freighter not detected");
    return await api.getPublicKey();
  },
  async isAllowed() {
    const api = await loadFreighter();
    if (!api) return false;
    try {
      return await api.isAllowed();
    } catch {
      return false;
    }
  },
  async requestAccess() {
    const api = await loadFreighter();
    if (!api) throw new SusuError("WALLET_NOT_FOUND", "Freighter not detected");
    const pk = await api.requestAccess();
    if (!pk) throw new SusuError("WALLET_USER_REJECTED", "Freighter returned no public key");
    return pk;
  },
  async getNetwork() {
    const api = await loadFreighter();
    if (!api) throw new SusuError("WALLET_NOT_FOUND", "Freighter not detected");
    return await api.getNetwork();
  },
  async signTransaction(xdr, networkPassphrase) {
    const api = await loadFreighter();
    if (!api) throw new SusuError("WALLET_NOT_FOUND", "Freighter not detected");
    return await api.signTransaction(xdr, { networkPassphrase });
  },
};

// Albedo exposes a global `window.albedo` object. It is a web-based
// signer, so the user does not need to install a separate extension.
// https://albedo.link/
interface AlbedoGlobal {
  publicKey(opts?: { token?: string }): Promise<{ pubkey: string; signed?: string }>;
  tx(opts: {
    xdr: string;
    network?: string;
    pubkey?: string;
    submit?: boolean;
  }): Promise<{ signed_envelope_xdr: string; result?: unknown; tx_hash?: string }>;
}

const albedoAdapter: WalletAdapter = {
  kind: "albedo",
  label: "Albedo",
  installUrl: "https://albedo.link/",
  async isAvailable() {
    if (typeof window === "undefined") return false;
    return Boolean((window as unknown as { albedo?: AlbedoGlobal }).albedo);
  },
  async getPublicKey() {
    const a = (window as unknown as { albedo?: AlbedoGlobal }).albedo;
    if (!a) throw new SusuError("WALLET_NOT_FOUND", "Albedo not available in this browser");
    try {
      const res = await a.publicKey();
      return res.pubkey;
    } catch (e) {
      throw new SusuError("WALLET_USER_REJECTED", "Albedo connection cancelled", { cause: e });
    }
  },
  async requestAccess() {
    return await this.getPublicKey();
  },
  async signTransaction(xdr, networkPassphrase) {
    const a = (window as unknown as { albedo?: AlbedoGlobal }).albedo;
    if (!a) throw new SusuError("WALLET_NOT_FOUND", "Albedo not available");
    try {
      const res = await a.tx({ xdr, network: networkPassphrase, submit: false });
      return res.signed_envelope_xdr;
    } catch (e) {
      throw new SusuError("WALLET_USER_REJECTED", "Albedo signing rejected", { cause: e });
    }
  },
};

// Rabet is a browser extension that exposes `window.rabet`. When
// `rabet` is not installed, the `isAvailable()` check returns false
// and the UI falls back to Freighter.
// https://rabet.io/
interface RabetGlobal {
  connect(): Promise<{ publicKey: string }>;
  sign(xdr: string, opts?: { network?: string }): Promise<{ signedXDR: string }>;
}

const rabetAdapter: WalletAdapter = {
  kind: "rabet",
  label: "Rabet",
  installUrl: "https://rabet.io/",
  async isAvailable() {
    if (typeof window === "undefined") return false;
    return Boolean((window as unknown as { rabet?: RabetGlobal }).rabet);
  },
  async getPublicKey() {
    const r = (window as unknown as { rabet?: RabetGlobal }).rabet;
    if (!r) throw new SusuError("WALLET_NOT_FOUND", "Rabet extension not detected");
    try {
      const res = await r.connect();
      return res.publicKey;
    } catch (e) {
      throw new SusuError("WALLET_USER_REJECTED", "Rabet connection cancelled", { cause: e });
    }
  },
  async requestAccess() {
    return await this.getPublicKey();
  },
  async signTransaction(xdr, networkPassphrase) {
    const r = (window as unknown as { rabet?: RabetGlobal }).rabet;
    if (!r) throw new SusuError("WALLET_NOT_FOUND", "Rabet extension not detected");
    try {
      const res = await r.sign(xdr, { network: networkPassphrase });
      return res.signedXDR;
    } catch (e) {
      throw new SusuError("WALLET_USER_REJECTED", "Rabet signing rejected", { cause: e });
    }
  },
};

export const WALLETS: Record<WalletKind, WalletAdapter> = {
  freighter: freighterAdapter,
  albedo: albedoAdapter,
  rabet: rabetAdapter,
};

export const ALL_WALLETS: WalletAdapter[] = [freighterAdapter, albedoAdapter, rabetAdapter];

export function networkPassphrase(): string {
  return NETWORK.networkPassphrase;
}
