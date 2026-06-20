import type { DecodedEvent, LiveEvent } from "../lib/horizon";

interface Props {
  events: LiveEvent[];
  className?: string;
  emptyHint?: string;
}

function short(addr: string): string {
  if (!addr) return "—";
  if (addr.length <= 10) return addr;
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function describe(e: DecodedEvent | null): { text: string; tone: string; icon: React.ReactNode } {
  if (!e) return { text: "Unknown event", tone: "badge-slate", icon: <Dot /> };
  switch (e.kind) {
    case "CircleCreated":
      return {
        text: `Circle #${e.circle_id} opened by ${short(e.creator)} · ${e.max_members} seats · ${e.deposit_amount}/round`,
        tone: "badge-amber",
        icon: <IconBolt />,
      };
    case "MemberJoined":
      return { text: `${short(e.member)} joined circle #${e.circle_id}`, tone: "badge-slate", icon: <IconUser /> };
    case "DepositReceived":
      return { text: `${short(e.member)} deposited ${e.amount} · circle #${e.circle_id}`, tone: "badge-green", icon: <IconDown /> };
    case "RoundClosed":
      return {
        text: `Round ${e.round_number} closed · circle #${e.circle_id} · ${e.total_collected} collected · ${e.defaulters.length} defaulter(s)`,
        tone: "badge-amber",
        icon: <IconLock />,
      };
    case "WinnerSelected":
      return {
        text: `WIN — ${short(e.winner)} took home ${e.pot_amount} · circle #${e.circle_id} · round ${e.round_number}`,
        tone: "badge-green",
        icon: <IconTrophy />,
      };
    case "MemberSlashedLocally":
      return { text: `Slashed · ${short(e.member)} · circle #${e.circle_id}`, tone: "badge-red", icon: <IconSlash /> };
    case "MemberSlashed":
      return {
        text: `Penalty: ${short(e.defaulter)} slashed for ${e.collateral_amount} → ${e.recipients_count} recipients`,
        tone: "badge-red",
        icon: <IconSlash />,
      };
    case "DistributionCompleted":
      return {
        text: `Distributed ${e.total} to ${e.recipients_count} recipients`,
        tone: "badge-slate",
        icon: <IconCheck />,
      };
    case "CircleCompleted":
      return { text: `Circle #${e.circle_id} complete`, tone: "badge-green", icon: <IconCheck /> };
    case "Unknown":
      return { text: "Unknown: " + e.raw, tone: "badge-slate", icon: <Dot /> };
  }
}

export function EventFeed({ events, className = "", emptyHint }: Props) {
  if (events.length === 0) {
    return (
      <div className={"rounded-xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center text-sm text-ink-500 " + className}>
        {emptyHint ?? "Live events will appear here as rounds progress."}
      </div>
    );
  }
  return (
    <ul className={"divide-y divide-ink-100 overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-ink-200/70 " + className}>
      {events.slice(0, 30).map((e, i) => {
        const d = describe(e.decoded);
        return (
          <li key={e.txHash + "-" + i} className="flex items-center gap-3 px-3.5 py-2.5 text-xs transition-colors hover:bg-ink-50/60">
            <span className={"shrink-0 " + d.tone}>{e.decoded?.kind ?? "Event"}</span>
            <span className="shrink-0 text-ink-400">{d.icon}</span>
            <span className="flex-1 truncate text-ink-700">{d.text}</span>
            <span className="shrink-0 font-mono text-[10px] text-ink-400">L{e.ledger}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-400" />;
}
function IconBolt() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M11.3 1.5a.75.75 0 0 1 .98.65l.6 4.35h3.37a.75.75 0 0 1 .58 1.23l-7 8.5a.75.75 0 0 1-1.31-.5L8.7 11H5.25a.75.75 0 0 1-.58-1.23l6.63-8.27Z" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M10 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-7 14a7 7 0 0 1 14 0 .75.75 0 0 1-.75.75H3.75A.75.75 0 0 1 3 16Z" />
    </svg>
  );
}
function IconDown() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M10 2a.75.75 0 0 1 .75.75v8.69l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 10.03a.75.75 0 0 1 1.06-1.06l2.47 2.47V2.75A.75.75 0 0 1 10 2Z" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6H8V5a2 2 0 1 1 4 0v2Z" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M5 3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h2a1 1 0 0 1 1 1v2a3 3 0 0 1-3 3 4 4 0 0 1-3 2.86V16h2a1 1 0 1 1 0 2H6a1 1 0 1 1 0-2h2v-2.14A4 4 0 0 1 5 11a3 3 0 0 1-3-3V6a1 1 0 0 1 1-1h2V3Zm9 5V5H6v3a3 3 0 0 0 6 0Zm2 0V7h-1v1a4 4 0 0 1-.13 1H15a1 1 0 0 0 1-1ZM5 8V7H4v1a1 1 0 0 0 1 1h.13A4 4 0 0 1 5 8Z" />
    </svg>
  );
}
function IconSlash() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M12.7 2.3a4 4 0 0 1 5 5L8.3 16.7a4 4 0 0 1-5-5L12.7 2.3Zm-1.4 1.4L4.7 10.3a2.5 2.5 0 0 0 3.5 3.5l6.6-6.6a2.5 2.5 0 0 0-3.5-3.5Z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4l3.9 3.9 6.7-6.7a1 1 0 0 1 1.4 0Z" />
    </svg>
  );
}