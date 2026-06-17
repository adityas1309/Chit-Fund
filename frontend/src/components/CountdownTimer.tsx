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
  if (days > 0) return days + "d " + hours + "h " + minutes + "m";
  if (hours > 0) return hours + "h " + minutes + "m " + secs + "s";
  if (minutes > 0) return minutes + "m " + secs + "s";
  return secs + "s";
}

export function CountdownTimer({ deadlineLedger, currentLedger, secondsPerLedger = 5, large = false }: Props) {
  const ledgersLeft = Math.max(0, deadlineLedger - currentLedger);
  const [secondsLeft, setSecondsLeft] = useState(ledgersLeft * secondsPerLedger);

  useEffect(() => {
    setSecondsLeft(ledgersLeft * secondsPerLedger);
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgersLeft, secondsPerLedger]);

  if (secondsLeft <= 0) {
    return (
      <div className={"font-mono " + (large ? "text-3xl" : "text-base") + " font-bold text-green-700"}>
        Ready to close
      </div>
    );
  }

  return (
    <div>
      <div className={"font-mono " + (large ? "text-4xl" : "text-lg") + " font-bold text-slate-900"} aria-live="polite">
        {formatDuration(secondsLeft)}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        ~{ledgersLeft} ledgers . ~{secondsPerLedger}s each
      </div>
    </div>
  );
}
