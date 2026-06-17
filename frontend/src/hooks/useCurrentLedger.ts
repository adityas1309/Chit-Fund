import { useEffect, useState } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { NETWORK } from "../lib/config";

const POLL_MS = 30_000;

export function useCurrentLedger(): { ledger: number; loading: boolean } {
  const [ledger, setLedger] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const server = new Horizon.Server(NETWORK.horizonUrl, { allowHttp: false });

    async function fetchLedger() {
      try {
        const resp = await server.ledgers().order("desc").limit(1).call();
        if (cancelled) return;
        const first = resp.records?.[0];
        if (first) setLedger(Number(first.sequence));
      } catch {
        // ignore - keep last value
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchLedger();
    const id = setInterval(fetchLedger, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { ledger, loading };
}
