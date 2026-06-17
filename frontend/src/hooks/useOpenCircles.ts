import { useEffect, useState, useCallback } from "react";
import { listOpenCircles, getCircleState, type CircleView } from "../lib/contract";
import { isConfigured } from "../lib/config";

export interface UseOpenCirclesState {
  ids: number[];
  views: CircleView[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOpenCircles(): UseOpenCirclesState {
  const [ids, setIds] = useState<number[]>([]);
  const [views, setViews] = useState<CircleView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isConfigured()) {
      setError("Contracts not configured");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listOpenCircles();
      setIds(list);
      const states = await Promise.all(list.map((id) => getCircleState(id).catch(() => null)));
      setViews(states.filter((v): v is CircleView => v !== null));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ids, views, loading, error, refresh };
}
