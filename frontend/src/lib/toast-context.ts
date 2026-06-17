import { createContext } from "react";

export type ToastKind = "info" | "success" | "error" | "warning";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  ttlMs?: number;
}

export interface ToastApi {
  toasts: Toast[];
  show: (kind: ToastKind, message: string, ttlMs?: number) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
