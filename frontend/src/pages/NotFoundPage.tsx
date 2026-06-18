import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-md text-center">
      <div className="text-5xl" aria-hidden>??</div>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">That URL doesn't match anything in this app.</p>
      <Link to="/" className="btn-primary mt-4 inline-flex">Back to home</Link>
    </div>
  );
}
