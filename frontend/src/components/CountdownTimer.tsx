import { useEffect, useState } from "react";

interface Props {
  secondsPerLedger?: number;
  deadlineLedger: number;
  currentLedger: number;
  large?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function CountdownTimer({ deadlineLedger, currentLedger, secondsPerLedger = 5, large = false }: Props) {
  const ledgersLeft = Math.max(0, deadlineLedger - currentLedger);
  const [secondsLeft, setSecondsLeft] = useState(ledgersLeft * secondsPerLedger);

  useEffect(() => {
    setSecondsLeft(ledgersLeft * secondsPerLedger);
    if (ledgersLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [ledgersLeft, secondsPerLedger]);

  if (ledgersLeft <= 0) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex h-2 w-2 animate-pulse-soft rounded-full bg-leaf-500" />
        <span className={"font-display font-semibold text-leaf-700 " + (large ? "text-2xl" : "text-base")}>
          Ready to close
        </span>
      </div>
    );
  }

  return (
    <div>
      <div
        className={"font-display font-semibold tabular-nums text-ink-900 " + (large ? "text-4xl" : "text-lg")}
        aria-live="polite"
      >
        {formatDuration(secondsLeft)}
      </div>
      <div className="mt-1 text-xs text-ink-500">
        ~{ledgersLeft} ledgers · ~{secondsPerLedger}s each
      </div>
    </div>
  );
}