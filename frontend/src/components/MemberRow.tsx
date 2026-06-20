import type { MemberInfo } from "../lib/contract";

interface Props {
  members: MemberInfo[];
  myAddress: string | null;
}

function shortAddr(a: string): string {
  if (!a) return "?";
  if (a.length <= 10) return a;
  return a.slice(0, 4) + "…" + a.slice(-4);
}

function avatarFor(addr: string): string {
  if (!addr) return "?";
  return addr.replace(/^G/, "").slice(0, 2).toUpperCase();
}

export function MemberRow({ members, myAddress }: Props) {
  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-6 text-center text-sm text-ink-500">
        No members have joined yet.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
      {members.map((m, idx) => {
        const deposited = m.deposited_current_round;
        const slashed = m.slashed;
        const won = m.has_won;
        const isMe = myAddress !== null && m.address === myAddress;
        const tone = slashed
          ? "bg-rust-50 ring-rust-200"
          : deposited
          ? "bg-leaf-50 ring-leaf-200"
          : won
          ? "bg-amber-50 ring-amber-200"
          : "bg-white ring-ink-200";
        const status = slashed
          ? { label: "Slashed", cls: "bg-rust-200 text-rust-800" }
          : deposited
          ? { label: "Deposited", cls: "bg-leaf-200 text-leaf-800" }
          : won
          ? { label: "Winner", cls: "bg-amber-200 text-amber-800" }
          : { label: "Pending", cls: "bg-ink-200 text-ink-700" };
        return (
          <li
            key={m.address}
            className={
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs ring-1 transition-colors " +
              tone +
              (isMe ? " shadow-soft" : "")
            }
          >
            <span
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold " +
                status.cls
              }
              aria-hidden
            >
              {avatarFor(m.address)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate font-mono text-ink-800">
                <span className="truncate">{shortAddr(m.address)}</span>
                {isMe && <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">you</span>}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-500">
                Seat {idx + 1}
              </div>
            </div>
            <span
              className={
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                status.cls
              }
            >
              {status.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}