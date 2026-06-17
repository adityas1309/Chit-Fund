import { useEffect, useState, useCallback } from "react";
import { getCircle, getCircleState, type Circle, type CircleView } from "../lib/contract";
import { isConfigured } from "../lib/config";

export interface UseCircleState {
  circle: Circle | null;
  view: CircleView | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCircle(id: number | null): UseCircleState {
  const [circle, setCircle] = useState<Circle | null>(null);
  const [view, setView] = useState<CircleView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (id === null) return;
    if (!isConfigured()) {
      setError("Contracts not configured");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [c, v] = await Promise.all([getCircle(id), getCircleState(id)]);
      setCircle(c);
      setView(v);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { circle, view, loading, error, refresh };
}
