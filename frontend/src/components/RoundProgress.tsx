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
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-600">
          <span>Circle progress</span>
          <span className="font-mono tabular-nums text-ink-700">Round {currentRound} of {totalRounds}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ink-700 via-ink-900 to-ink-700 transition-all"
            style={{ width: roundPct + "%" }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-600">
          <span>Deposits this round</span>
          <span className="font-mono tabular-nums text-ink-700">{depositsCount} / {totalMembers}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-leaf-500 to-leaf-600 transition-all"
            style={{ width: depositPct + "%" }}
          />
        </div>
      </div>
    </div>
  );
}