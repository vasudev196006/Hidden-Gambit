import React, { useMemo } from "react";
import { Chess } from "chess.js";

interface CapturedPiecesProps {
  fen: string;
  displayFor: "white" | "black";
}

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};

const INITIAL_COUNTS: Record<string, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
};

const PIECE_SYMBOLS: Record<string, { w: string; b: string }> = {
  p: { w: "♙", b: "♟" },
  n: { w: "♘", b: "♞" },
  b: { w: "♗", b: "♝" },
  r: { w: "♖", b: "♜" },
  q: { w: "♕", b: "♛" },
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ fen, displayFor }) => {
  const { capturedPieces, advantageScore } = useMemo(() => {
    try {
      const chess = new Chess(fen);
      const board = chess.board();

      const currentCounts = {
        w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
        b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      };

      let whiteScore = 0;
      let blackScore = 0;

      for (const row of board) {
        for (const square of row) {
          if (square) {
            const color = square.color as "w" | "b";
            const type = square.type as "p" | "n" | "b" | "r" | "q" | "k";
            if (type !== "k") {
              currentCounts[color][type]++;
              const val = PIECE_VALUES[type] || 0;
              if (color === "w") whiteScore += val;
              else blackScore += val;
            }
          }
        }
      }

      // Captured by White = Black pieces missing from board
      // Captured by Black = White pieces missing from board
      const capturedByWhite: { type: string; symbol: string }[] = [];
      const capturedByBlack: { type: string; symbol: string }[] = [];

      (["q", "r", "b", "n", "p"] as const).forEach((t) => {
        const missingBlack = INITIAL_COUNTS[t] - currentCounts.b[t];
        for (let i = 0; i < missingBlack; i++) {
          capturedByWhite.push({ type: t, symbol: PIECE_SYMBOLS[t].b });
        }

        const missingWhite = INITIAL_COUNTS[t] - currentCounts.w[t];
        for (let i = 0; i < missingWhite; i++) {
          capturedByBlack.push({ type: t, symbol: PIECE_SYMBOLS[t].w });
        }
      });

      const diff = whiteScore - blackScore;
      let advantage = 0;
      if (displayFor === "white" && diff > 0) {
        advantage = diff;
      } else if (displayFor === "black" && diff < 0) {
        advantage = Math.abs(diff);
      }

      return {
        capturedPieces: displayFor === "white" ? capturedByWhite : capturedByBlack,
        advantageScore: advantage,
      };
    } catch {
      return { capturedPieces: [], advantageScore: 0 };
    }
  }, [fen, displayFor]);

  if (capturedPieces.length === 0 && advantageScore === 0) {
    return <div className="h-5" />;
  }

  return (
    <div className="flex items-center gap-1 text-sm font-mono select-none">
      <div className="flex items-center -space-x-1 overflow-hidden">
        {capturedPieces.map((p, idx) => (
          <span
            key={`${p.type}-${idx}`}
            className="inline-block text-base leading-none transition-transform hover:scale-125"
            title={`Captured ${p.type.toUpperCase()}`}
          >
            {p.symbol}
          </span>
        ))}
      </div>
      {advantageScore > 0 && (
        <span className="ml-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          +{advantageScore}
        </span>
      )}
    </div>
  );
};
