import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface GameClockProps {
  timeControl: string;
  whiteTimeMs: number | null;
  blackTimeMs: number | null;
  turnStartedAt: number | null;
  turn: "white" | "black";
  status: string;
  displayFor: "white" | "black";
  onTimeout?: () => void;
}

function formatMs(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins > 0) {
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  const tenths = Math.floor((ms % 1000) / 100);
  return `${secs.toString().padStart(2, "0")}.${tenths}`;
}

export const GameClock: React.FC<GameClockProps> = ({
  timeControl,
  whiteTimeMs,
  blackTimeMs,
  turnStartedAt,
  turn,
  status,
  displayFor,
  onTimeout,
}) => {
  const [remainingMs, setRemainingMs] = useState<number | null>(() => {
    return displayFor === "white" ? whiteTimeMs : blackTimeMs;
  });

  useEffect(() => {
    if (timeControl === "none" || status !== "active" || !turnStartedAt) {
      setRemainingMs(displayFor === "white" ? whiteTimeMs : blackTimeMs);
      return;
    }

    const interval = setInterval(() => {
      const baseMs = displayFor === "white" ? whiteTimeMs : blackTimeMs;
      if (baseMs == null) return;

      if (turn === displayFor) {
        const elapsed = Date.now() - turnStartedAt;
        const current = Math.max(0, baseMs - elapsed);
        setRemainingMs(current);
        if (current <= 0 && onTimeout) {
          onTimeout();
        }
      } else {
        setRemainingMs(baseMs);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timeControl, status, turnStartedAt, turn, displayFor, whiteTimeMs, blackTimeMs, onTimeout]);

  if (timeControl === "none" || remainingMs == null) {
    return null;
  }

  const isActive = status === "active" && turn === displayFor;
  const isLowTime = remainingMs < 30000;

  return (
    <div
      className={`font-mono text-sm font-bold px-2 py-1 rounded flex items-center gap-1.5 border transition-all ${
        isActive
          ? isLowTime
            ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.4)]"
            : "bg-primary/20 text-primary border-primary/50"
          : "bg-secondary/40 text-muted-foreground border-border opacity-75"
      }`}
    >
      <Clock className={`h-3.5 w-3.5 ${isActive ? "animate-spin" : ""}`} />
      <span>{formatMs(remainingMs)}</span>
    </div>
  );
};
