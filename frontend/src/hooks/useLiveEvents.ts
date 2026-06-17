import { useEffect, useState } from "react";
import { subscribeToEvents, type LiveEvent } from "../lib/horizon";
import { SAVINGS_CIRCLE_CONTRACT_ID, PENALTY_HANDLER_CONTRACT_ID } from "../lib/config";

const MAX_EVENTS = 50;

export function useLiveEvents(): { events: LiveEvent[]; connected: boolean } {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ids = [SAVINGS_CIRCLE_CONTRACT_ID, PENALTY_HANDLER_CONTRACT_ID].filter(Boolean);
    if (ids.length === 0) {
      setConnected(false);
      return;
    }
    const unsub = subscribeToEvents(
      ids,
      (e) => {
        setEvents((prev) => [e, ...prev].slice(0, MAX_EVENTS));
        setConnected(true);
      },
      () => setConnected(false)
    );
    return () => unsub();
  }, []);

  return { events, connected };
}
