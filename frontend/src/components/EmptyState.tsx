import { Link } from "react-router-dom";

interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, actionTo, onAction, icon }: Props) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-700 ring-1 ring-ink-200">
        {icon ?? <DefaultIcon />}
      </div>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      {actionLabel && (actionTo || onAction) && (
        actionTo ? (
          <Link to={actionTo} className="btn-primary mt-2">{actionLabel}</Link>
        ) : (
          <button type="button" onClick={onAction} className="btn-primary mt-2">{actionLabel}</button>
        )
      )}
    </div>
  );
}

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 13.5c.6 1 1.7 1.5 3 1.5s2.4-.5 3-1.5" strokeLinecap="round" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}