import { Link, NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { ConnectButton } from "./ConnectButton";
import { NETWORK } from "../lib/config";

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  useEffect(() => {
    return () => setMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen text-ink-900">
      <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-ink-50/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5" onClick={close}>
            <LogoMark />
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="font-display text-xl font-semibold tracking-tight text-ink-900">Susu</span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-ink-500 sm:inline">Chit Fund</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavItem to="/" onClick={close}>Overview</NavItem>
            <NavItem to="/circles" onClick={close}>Circles</NavItem>
            <NavItem to="/create" onClick={close}>Create</NavItem>
          </nav>

          <div className="flex items-center gap-2">
            <NetworkPill />
            <ConnectButton />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 hover:bg-ink-100 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-ink-200/60 bg-ink-50/95 backdrop-blur md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
              <NavItem to="/" onClick={close}>Overview</NavItem>
              <NavItem to="/circles" onClick={close}>Circles</NavItem>
              <NavItem to="/create" onClick={close}>Create</NavItem>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 animate-fade-up">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-ink-200/60 bg-ink-50/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span>Susu Protocol · built on Stellar / Soroban testnet.</span>
          </div>
          <div className="flex items-center gap-4">
            <a className="hover:text-ink-800" href="https://stellar.org" target="_blank" rel="noreferrer">Stellar</a>
            <a className="hover:text-ink-800" href="https://soroban.stellar.org" target="_blank" rel="noreferrer">Soroban</a>
            <a className="hover:text-ink-800" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          </div>
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
        (isActive
          ? "bg-ink-900 text-ink-50"
          : "text-ink-600 hover:bg-ink-100 hover:text-ink-900")
      }
    >
      {children}
    </NavLink>
  );
}

function NetworkPill() {
  return (
    <div
      className="hidden items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-700 shadow-soft ring-1 ring-ink-200/70 sm:inline-flex"
      title={NETWORK.networkPassphrase}
    >
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-leaf-400" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf-500" />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wider">{NETWORK.label}</span>
    </div>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center rounded-xl bg-ink-900 text-ink-50 shadow-soft"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} aria-hidden>
        <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="16" r="3" fill="#f49a16" />
        <path d="M5 16a11 11 0 0 1 22 0" fill="none" stroke="#f49a16" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm.75 4.5a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H2.75Z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}