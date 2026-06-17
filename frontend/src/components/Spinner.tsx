interface Props {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Spinner({ size = "md", label }: Props) {
  const dim = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" }[size];
  return (
    <div className="inline-flex items-center gap-2 text-slate-500" role="status" aria-live="polite">
      <svg
        className={dim + " animate-spin text-brand-600"}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4Z"
          className="opacity-75"
        />
      </svg>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
