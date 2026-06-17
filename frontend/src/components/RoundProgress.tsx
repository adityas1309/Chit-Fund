interface Props {
  currentRound: number;
  totalRounds: number;
  depositsCount: number;
  totalMembers: number;
}

export function RoundProgress({ currentRound, totalRounds, depositsCount, totalMembers }: Props) {
  const roundPct = totalRounds > 0 ? Math.min(100, (currentRound / totalRounds) * 100) : 0;
  const depositPct = totalMembers > 0 ? Math.min(100, (depositsCount / totalMembers) * 100) : 0;
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>Round {currentRound} of {totalRounds}</span>
          <span>{Math.round(roundPct)}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
            style={{ width: roundPct + "%" }}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>This round deposits</span>
          <span>{depositsCount}/{totalMembers}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: depositPct + "%" }}
          />
        </div>
      </div>
    </div>
  );
}
