import { ReactNode, useCallback, useMemo, useState } from "react";
import { ToastContext, type ToastApi, type Toast } from "./toast-context";

export type { Toast, ToastApi, ToastKind } from "./toast-context";
export { ToastContext } from "./toast-context";

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (kind: Toast["kind"], message: string, ttlMs: number = 5000) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, kind, message, ttlMs }]);
      if (ttlMs > 0) {
        setTimeout(() => dismiss(id), ttlMs);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastApi>(
    () => ({ toasts, show, dismiss }),
    [toasts, show, dismiss]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
