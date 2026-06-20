import { useToast } from "../lib/use-toast";
import type { Toast } from "../lib/toast-context";

const palette: Record<Toast["kind"], { wrap: string; icon: React.ReactNode }> = {
  info: {
    wrap: "bg-ink-900 text-ink-50 ring-ink-900",
    icon: <IconInfo />,
  },
  success: {
    wrap: "bg-leaf-700 text-leaf-50 ring-leaf-700",
    icon: <IconCheck />,
  },
  error: {
    wrap: "bg-rust-700 text-rust-50 ring-rust-700",
    icon: <IconAlert />,
  },
  warning: {
    wrap: "bg-amber-500 text-ink-900 ring-amber-500",
    icon: <IconWarn />,
  },
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-4 sm:left-auto sm:right-4 sm:top-auto sm:items-end"
    >
      {toasts.map((t) => {
        const p = palette[t.kind];
        return (
          <div
            key={t.id}
            className={
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lift ring-1 animate-fade-up " +
              p.wrap
            }
          >
            <span className="mt-0.5 shrink-0">{p.icon}</span>
            <span className="flex-1 font-medium leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 1a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm.75 3.5a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4l3.9 3.9 6.7-6.7a1 1 0 0 1 1.4 0Z" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 1.5 1 17h18L10 1.5Zm0 5.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 7Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}
function IconWarn() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 7a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1Zm0-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
    </svg>
  );
}