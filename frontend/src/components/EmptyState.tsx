import { Link } from "react-router-dom";

interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  emoji?: string;
}

export function EmptyState({ title, description, actionLabel, actionTo, emoji = "??" }: Props) {
  return (
    <div className="card flex flex-col items-center gap-3 text-center">
      <div className="text-4xl" aria-hidden>{emoji}</div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="max-w-md text-sm text-slate-500">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-2">{actionLabel}</Link>
      )}
    </div>
  );
}
