import { Outlet, NavLink, Link } from "react-router-dom";
import { ConnectButton } from "./ConnectButton";
import { useState } from "react";

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);
  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2" onClick={close}>
            <span aria-hidden className="inline-block h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 ring-2 ring-white shadow" />
            <span className="text-lg font-semibold tracking-tight">Susu</span>
            <span className="hidden text-xs text-slate-500 sm:inline">. Tokenised Chit Fund</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavItem to="/">Home</NavItem>
            <NavItem to="/circles">Browse</NavItem>
            <NavItem to="/create">Create</NavItem>
          </nav>
          <div className="flex items-center gap-2">
            <ConnectButton />
            <button
              type="button"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm.75 4.5a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H2.75Z" />
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2" aria-label="Mobile">
              <NavItem to="/" onClick={close}>Home</NavItem>
              <NavItem to="/circles" onClick={close}>Browse</NavItem>
              <NavItem to="/create" onClick={close}>Create</NavItem>
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>(c) Susu Protocol - built on Stellar / Soroban.</span>
          <span className="flex items-center gap-3">
            <a className="hover:text-slate-700" href="https://github.com" rel="noreferrer">GitHub</a>
            <a className="hover:text-slate-700" href="https://stellar.org" rel="noreferrer">Stellar</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
        (isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
      }
    >
      {children}
    </NavLink>
  );
}
