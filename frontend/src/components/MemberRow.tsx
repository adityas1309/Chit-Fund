import type { MemberInfo, CircleView } from "../lib/contract";

interface Props {
  members: MemberInfo[];
  view: CircleView;
  myAddress: string | null;
}

function shortAddr(a: string): string {
  if (a.length <= 10) return a;
  return a.slice(0, 4) + "..." + a.slice(-4);
}

export function MemberRow({ members, myAddress }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {members.map((m) => {
        const deposited = m.deposited_current_round;
        const slashed = m.slashed;
        const won = m.has_won;
        const isMe = myAddress !== null && m.address === myAddress;
        const tone = slashed
          ? "bg-red-50 ring-red-200"
          : deposited
          ? "bg-green-50 ring-green-200"
          : won
          ? "bg-amber-50 ring-amber-200"
          : "bg-white ring-slate-200";
        const icon = slashed ? "X" : deposited ? "OK" : won ? "W" : "-";
        const iconTone = slashed
          ? "bg-red-200 text-red-800"
          : deposited
          ? "bg-green-200 text-green-800"
          : won
          ? "bg-amber-200 text-amber-800"
          : "bg-slate-200 text-slate-700";
        return (
          <li
            key={m.address}
            className={"flex items-center gap-2 rounded-lg px-3 py-2 text-xs ring-1 " + tone}
          >
            <span
              className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold " + iconTone}
            >
              {icon}
            </span>
            <span className="flex-1 truncate font-mono">
              {shortAddr(m.address)}
              {isMe && <span className="ml-1 text-brand-600">(you)</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
