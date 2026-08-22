import React, { useRef, useEffect } from "react";
import { Zap, Search, AlertTriangle, ShieldCheck, Swords } from "lucide-react";

export interface MoveHistoryItem {
  type?: "investigation" | "penalty";
  from?: string;
  to?: string;
  promotion?: string;
  moveType?: "knight" | "bishop";
  impostor?: boolean;
  player: "white" | "black";
  square?: string;
  success?: boolean;
  pieceType?: string;
}

interface MoveHistoryPanelProps {
  history: MoveHistoryItem[];
  whitePlayerName?: string;
  blackPlayerName?: string;
}

export const MoveHistoryPanel: React.FC<MoveHistoryPanelProps> = ({
  history = [],
  whitePlayerName = "White",
  blackPlayerName = "Black",
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  if (!history || history.length === 0) {
    return (
      <div className="p-4 text-center text-xs font-mono text-muted-foreground border border-dashed border-border rounded-lg bg-background/50">
        No moves executed yet.
      </div>
    );
  }

  // Pair up moves into full turns (1. White Move / Black Move)
  // Special events span full width
  const renderEntries = () => {
    const elements: React.ReactNode[] = [];
    let currentTurnNumber = 1;
    let pendingWhite: MoveHistoryItem | null = null;

    history.forEach((item, index) => {
      if (item.type === "investigation") {
        if (pendingWhite) {
          elements.push(
            <div key={`turn-${currentTurnNumber}-partial`} className="grid grid-cols-12 gap-1 text-xs font-mono py-1 items-center hover:bg-secondary/30 rounded px-1">
              <span className="col-span-2 text-muted-foreground">{currentTurnNumber}.</span>
              <span className="col-span-5 font-medium text-foreground">{renderItemInline(pendingWhite)}</span>
              <span className="col-span-5 text-muted-foreground">—</span>
            </div>
          );
          pendingWhite = null;
          currentTurnNumber++;
        }

        const isWhite = item.player === "white";
        elements.push(
          <div
            key={`event-${index}`}
            className={`my-1.5 p-2 rounded text-xs font-mono border flex items-center gap-2 ${
              item.success
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                : "bg-red-500/10 border-red-500/40 text-red-400"
            }`}
          >
            {item.success ? (
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <div>
              <span className="font-bold">{isWhite ? whitePlayerName : blackPlayerName}</span> investigated{" "}
              <span className="font-bold underline">{item.square}</span> —{" "}
              {item.success ? "SUCCESS! Pawn Secured." : "FAILED! Penalty mode triggered."}
            </div>
          </div>
        );
        return;
      }

      if (item.type === "penalty") {
        if (pendingWhite) {
          elements.push(
            <div key={`turn-${currentTurnNumber}-partial`} className="grid grid-cols-12 gap-1 text-xs font-mono py-1 items-center hover:bg-secondary/30 rounded px-1">
              <span className="col-span-2 text-muted-foreground">{currentTurnNumber}.</span>
              <span className="col-span-5 font-medium text-foreground">{renderItemInline(pendingWhite)}</span>
              <span className="col-span-5 text-muted-foreground">—</span>
            </div>
          );
          pendingWhite = null;
          currentTurnNumber++;
        }

        const isWhite = item.player === "white";
        elements.push(
          <div
            key={`event-${index}`}
            className="my-1.5 p-2 rounded text-xs font-mono border bg-amber-500/10 border-amber-500/40 text-amber-400 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold">{isWhite ? whitePlayerName : blackPlayerName}</span> removed opponent's{" "}
              <span className="font-bold uppercase">{item.pieceType}</span> at {item.square}
            </div>
          </div>
        );
        return;
      }

      // Standard / Impostor Move
      if (item.player === "white") {
        if (pendingWhite) {
          elements.push(
            <div key={`turn-${currentTurnNumber}`} className="grid grid-cols-12 gap-1 text-xs font-mono py-1 items-center hover:bg-secondary/30 rounded px-1">
              <span className="col-span-2 text-muted-foreground">{currentTurnNumber}.</span>
              <span className="col-span-5 font-medium text-foreground">{renderItemInline(pendingWhite)}</span>
              <span className="col-span-5 text-muted-foreground">—</span>
            </div>
          );
          currentTurnNumber++;
        }
        pendingWhite = item;
      } else {
        if (pendingWhite) {
          elements.push(
            <div key={`turn-${currentTurnNumber}`} className="grid grid-cols-12 gap-1 text-xs font-mono py-1 items-center hover:bg-secondary/30 rounded px-1">
              <span className="col-span-2 text-muted-foreground">{currentTurnNumber}.</span>
              <span className="col-span-5 font-medium text-foreground">{renderItemInline(pendingWhite)}</span>
              <span className="col-span-5 font-medium text-foreground">{renderItemInline(item)}</span>
            </div>
          );
          pendingWhite = null;
          currentTurnNumber++;
        } else {
          elements.push(
            <div key={`turn-${currentTurnNumber}-blackonly`} className="grid grid-cols-12 gap-1 text-xs font-mono py-1 items-center hover:bg-secondary/30 rounded px-1">
              <span className="col-span-2 text-muted-foreground">{currentTurnNumber}.</span>
              <span className="col-span-5 text-muted-foreground">...</span>
              <span className="col-span-5 font-medium text-foreground">{renderItemInline(item)}</span>
            </div>
          );
          currentTurnNumber++;
        }
      }
    });

    if (pendingWhite) {
      elements.push(
        <div key={`turn-${currentTurnNumber}-final`} className="grid grid-cols-12 gap-1 text-xs font-mono py-1 items-center hover:bg-secondary/30 rounded px-1">
          <span className="col-span-2 text-muted-foreground">{currentTurnNumber}.</span>
          <span className="col-span-5 font-medium text-foreground">{renderItemInline(pendingWhite)}</span>
          <span className="col-span-5 text-muted-foreground">...</span>
        </div>
      );
    }

    return elements;
  };

  const renderItemInline = (item: MoveHistoryItem) => {
    if (item.impostor) {
      return (
        <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-500/10 px-1 py-0.5 rounded border border-red-500/30">
          <Zap className="h-3 w-3 shrink-0" />
          {item.from}→{item.to} ({item.moveType?.[0].toUpperCase()})
        </span>
      );
    }
    return (
      <span>
        {item.from}→{item.to}
        {item.promotion ? `=${item.promotion.toUpperCase()}` : ""}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-44 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin scrollbar-thumb-border">
      {renderEntries()}
      <div ref={bottomRef} />
    </div>
  );
};
