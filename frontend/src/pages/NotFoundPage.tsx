
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">404</p>
      <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight text-ink-900">Wrong pot.</h1>
      <p className="mt-3 text-ink-500">That URL doesn't match anything in this app.</p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        Back to home
      </Link>
    </div>
  );
}
