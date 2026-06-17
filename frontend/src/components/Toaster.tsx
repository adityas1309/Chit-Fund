import { useToast } from "../lib/use-toast";

const palette: Record<string, string> = {
  info: "bg-slate-900 text-white",
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-4 sm:top-4 sm:right-4 sm:left-auto sm:items-end"
    >
      {toasts.map((t: { id: number; kind: string; message: string }) => (
        <div
          key={t.id}
          className={"pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 shadow-lg ring-1 ring-black/5 " + (palette[t.kind] ?? palette.info)}
        >
          <span className="flex-1 text-sm font-medium leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="-mr-1 rounded p-1 text-white/80 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
