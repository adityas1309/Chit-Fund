interface Props {
  size?: "sm" | "md" | "lg";
  label?: string;
  tone?: "default" | "amber" | "white";
}

export function Spinner({ size = "md", label, tone = "default" }: Props) {
  const dim = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" }[size];
  const color =
    tone === "amber" ? "text-amber-500" : tone === "white" ? "text-white" : "text-ink-700";
  return (
    <div className="inline-flex items-center gap-2 text-ink-500" role="status" aria-live="polite">
      <svg className={dim + " animate-spin " + color} viewBox="0 0 24 24" fill="none" aria-hidden>
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