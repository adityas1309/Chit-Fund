import type { DecodedEvent, LiveEvent } from "../lib/horizon";

interface Props {
  events: LiveEvent[];
  className?: string;
}

function short(addr: string): string {
  if (!addr) return "?";
  if (addr.length <= 10) return addr;
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function describe(e: DecodedEvent | null): { text: string; tone: string } {
  if (!e) return { text: "Unknown event", tone: "badge-slate" };
  switch (e.kind) {
    case "CircleCreated":
      return {
        text: "Circle #" + e.circle_id + " created by " + short(e.creator) + " . " + e.max_members + " seats . " + e.deposit_amount + "/round",
        tone: "badge-amber",
      };
    case "MemberJoined":
      return { text: short(e.member) + " joined circle #" + e.circle_id, tone: "badge-slate" };
    case "DepositReceived":
      return { text: short(e.member) + " deposited " + e.amount + " (circle #" + e.circle_id + ")", tone: "badge-green" };
    case "RoundClosed":
      return {
        text: "Round " + e.round_number + " closed on #" + e.circle_id + " . " + e.total_collected + " collected . " + e.defaulters.length + " defaulter(s)",
        tone: "badge-amber",
      };
    case "WinnerSelected":
      return {
        text: "WIN " + short(e.winner) + " won " + e.pot_amount + " (circle #" + e.circle_id + " . round " + e.round_number + ")",
        tone: "badge-green",
      };
    case "MemberSlashedLocally":
      return { text: "WARN " + short(e.member) + " slashed in circle #" + e.circle_id, tone: "badge-red" };
    case "MemberSlashed":
      return {
        text: "Penalty contract slashed " + short(e.defaulter) + " for " + e.collateral_amount + " -> " + e.recipients_count + " recipients",
        tone: "badge-red",
      };
    case "DistributionCompleted":
      return {
        text: "Distributed " + e.total + " to " + e.recipients_count + " recipients",
        tone: "badge-slate",
      };
    case "CircleCompleted":
      return { text: "OK Circle #" + e.circle_id + " completed", tone: "badge-green" };
    case "Unknown":
      return { text: "Unknown: " + e.raw, tone: "badge-slate" };
  }
}

export function EventFeed({ events, className = "" }: Props) {
  if (events.length === 0) {
    return (
      <div className={"text-sm text-slate-500 " + className}>
        Live event feed will populate when the next block is sealed.
      </div>
    );
  }
  return (
    <ul className={"divide-y divide-slate-100 overflow-hidden rounded-lg ring-1 ring-slate-200 bg-white " + className}>
      {events.slice(0, 30).map((e, i) => {
        const d = describe(e.decoded);
        return (
          <li key={e.txHash + "-" + i} className="flex items-start gap-2 px-3 py-2 text-xs">
            <span className={d.tone + " shrink-0"}>{e.decoded?.kind ?? "Event"}</span>
            <span className="flex-1 text-slate-700">{d.text}</span>
            <span className="shrink-0 font-mono text-[10px] text-slate-400">L{e.ledger}</span>
          </li>
        );
      })}
    </ul>
  );
}
