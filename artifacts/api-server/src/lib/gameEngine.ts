import { Chess } from "chess.js";

export type Color = "white" | "black";
export type MoveType = "knight" | "bishop";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

function squareToCoords(square: string): [number, number] {
  const file = FILES.indexOf(square[0]);
  const rank = RANKS.indexOf(square[1]);
  return [file, rank];
}

function coordsToSquare(file: number, rank: number): string | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return FILES[file] + RANKS[rank];
}

export function getImpostorMoves(
  fromSquare: string,
  moveType: MoveType,
  impostorColor: Color,
  fen?: string,
  securedSquares: string[] = []
): string[] {
  const [file, rank] = squareToCoords(fromSquare);
  const destinations: string[] = [];

  if (moveType === "knight") {
    const knightDeltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [df, dr] of knightDeltas) {
      const targetRank = rank + dr;
      const isForward = impostorColor === "white" ? targetRank < rank : targetRank > rank;
      if (!isForward) continue;

      const sq = coordsToSquare(file + df, targetRank);
      if (sq) destinations.push(sq);
    }
  } else {
    // Bishop move = slide diagonally in forward directions (like normal bishop but not backwards)
    const chess = fen ? new Chess(fen) : null;
    const playerChessColor = impostorColor === "white" ? "w" : "b";

    // White's impostor (Black pawn) moves down: [-1, -1] and [1, -1]
    // Black's impostor (White pawn) moves up: [-1, 1] and [1, 1]
    const directions = impostorColor === "white"
      ? [[-1, -1], [1, -1]]
      : [[-1, 1], [1, 1]];

    for (const [df, dr] of directions) {
      let step = 1;
      while (true) {
        const nextFile = file + df * step;
        const nextRank = rank + dr * step;
        const sq = coordsToSquare(nextFile, nextRank);
        if (!sq) break; // off board

        if (chess) {
          const piece = chess.get(sq as any);
          if (!piece) {
            destinations.push(sq);
          } else {
            if (piece.color !== playerChessColor) {
              destinations.push(sq);
            }
            break; // blocked
          }
        } else {
          destinations.push(sq);
        }
        step++;
      }
    }
  }

  return destinations.filter((sq) => !securedSquares.includes(sq));
}

export function isValidImpostorMove(
  fromSquare: string,
  toSquare: string,
  moveType: MoveType,
  fen: string,
  impostorColor: Color,
  securedSquares: string[] = []
): { valid: boolean; error?: string } {
  const chess = new Chess(fen);
  const impostorPiece = chess.get(fromSquare as any);

  if (!impostorPiece) {
    return { valid: false, error: "Impostor pawn no longer exists" };
  }
  if (impostorPiece.type !== "p") {
    return { valid: false, error: "Impostor is not a pawn" };
  }

  // Validate that the impostor has left its home rank
  const [_, rank] = squareToCoords(fromSquare);
  const startingRank = impostorColor === "white" ? 6 : 1; // Rank 7 (index 6) for White's impostor, Rank 2 (index 1) for Black's impostor
  if (rank === startingRank) {
    return { valid: false, error: "Impostor pawn cannot be activated from its starting rank" };
  }

  if (securedSquares.includes(toSquare)) {
    return { valid: false, error: "Cannot capture a secured pawn with a knight or bishop" };
  }

  const validDestinations = getImpostorMoves(fromSquare, moveType, impostorColor, fen, securedSquares);
  if (!validDestinations.includes(toSquare)) {
    return { valid: false, error: `Invalid ${moveType} move destination` };
  }

  // Cannot land on own piece
  const targetPiece = chess.get(toSquare as any);
  const chessColor = impostorColor === "white" ? "w" : "b";
  if (targetPiece && targetPiece.color === chessColor) {
    return { valid: false, error: "Cannot capture own piece" };
  }

  return { valid: true };
}

export function applyImpostorMove(
  fen: string,
  fromSquare: string,
  toSquare: string,
  impostorColor: Color
): string {
  const chess = new Chess(fen);
  const chessColor = impostorColor === "white" ? "w" : "b";

  // Check if there is a piece at the destination square to determine if a capture occurred
  const targetPiece = chess.get(toSquare as any);
  const isCapture = !!targetPiece;

  // Remove pawn from source, place on destination (removing any capture)
  chess.remove(fromSquare as any);
  chess.remove(toSquare as any);
  chess.put({ type: "p", color: chessColor }, toSquare as any);

  // Rebuild FEN with switched turn
  const parts = chess.fen().split(" ");
  // Switch turn
  const currentTurn = parts[1];
  parts[1] = currentTurn === "w" ? "b" : "w";
  // Reset en passant
  parts[3] = "-";
  // Update half-move clock (reset on capture, increment otherwise)
  const halfMoveClock = parseInt(parts[4]);
  parts[4] = isCapture ? "0" : String(halfMoveClock + 1);
  // Increment full move number if black just moved
  if (impostorColor === "black") {
    parts[5] = String(parseInt(parts[5]) + 1);
  }

  return parts.join(" ");
}

export function applyInvestigationPenalty(fen: string, penalizedColor: Color): string {
  const chess = new Chess(fen);
  const chessColor = penalizedColor === "white" ? "w" : "b";

  // Find and remove one knight
  let knightRemoved = false;
  let bishopRemoved = false;

  for (const square of getAllSquares()) {
    const piece = chess.get(square as any);
    if (!piece || piece.color !== chessColor) continue;
    if (!knightRemoved && piece.type === "n") {
      chess.remove(square as any);
      knightRemoved = true;
    }
    if (knightRemoved && !bishopRemoved && piece.type === "b") {
      chess.remove(square as any);
      bishopRemoved = true;
    }
    if (knightRemoved && bishopRemoved) break;
  }

  // Rebuild with same turn
  return chess.fen();
}

export function removePieceOfType(fen: string, penalizedColor: Color, pieceType: "n" | "b"): string {
  const chess = new Chess(fen);
  const chessColor = penalizedColor === "white" ? "w" : "b";

  for (const square of getAllSquares()) {
    const piece = chess.get(square as any);
    if (!piece || piece.color !== chessColor) continue;
    if (piece.type === pieceType) {
      chess.remove(square as any);
      break;
    }
  }

  return chess.fen();
}

export function hasKnightOrBishop(fen: string, penalizedColor: Color): { knight: boolean; bishop: boolean } {
  const chess = new Chess(fen);
  const chessColor = penalizedColor === "white" ? "w" : "b";
  let knight = false;
  let bishop = false;

  for (const square of getAllSquares()) {
    const piece = chess.get(square as any);
    if (piece && piece.color === chessColor) {
      if (piece.type === "n") knight = true;
      if (piece.type === "b") bishop = true;
    }
  }

  return { knight, bishop };
}

export function isSecuredPawnAttacked(
  fen: string,
  move: { from: string; to: string },
  securedSquares: string[]
): boolean {
  if (!securedSquares.includes(move.to)) return false;
  const chess = new Chess(fen);
  const movingPiece = chess.get(move.from as any);
  if (!movingPiece) return false;
  // Knights and bishops cannot capture secured pawns
  return movingPiece.type === "n" || movingPiece.type === "b";
}

export function getValidMoves(
  fen: string,
  fromSquare: string,
  securedSquares: string[]
): string[] {
  const chess = new Chess(fen);
  const moves = chess.moves({ square: fromSquare as any, verbose: true });
  return moves
    .filter((m) => !isSecuredPawnAttacked(fen, { from: m.from, to: m.to }, securedSquares))
    .map((m) => m.to);
}

export function applyStandardMove(
  fen: string,
  from: string,
  to: string,
  promotion?: string,
  securedSquares: string[] = []
): { newFen: string; captured?: string; promotion?: boolean; error?: string } {
  const chess = new Chess(fen);

  // Validate promotion piece
  if (promotion && !["q", "r", "b", "n"].includes(promotion.toLowerCase())) {
    return { newFen: fen, error: "Invalid promotion piece" };
  }

  // Block knight/bishop captures on secured pawns
  if (isSecuredPawnAttacked(fen, { from, to }, securedSquares)) {
    return { newFen: fen, error: "Cannot capture a secured pawn with a knight or bishop" };
  }

  try {
    const move = chess.move({ from: from as any, to: to as any, promotion: promotion as any });
    if (!move) {
      return { newFen: fen, error: "Invalid move" };
    }
    return {
      newFen: chess.fen(),
      captured: move.captured,
      promotion: move.flags.includes("p"),
    };
  } catch {
    return { newFen: fen, error: "Invalid move" };
  }
}

export function checkGameOver(fen: string): { over: boolean; winner?: "white" | "black" | "draw" } {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "black" : "white";
    return { over: true, winner };
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return { over: true, winner: "draw" };
  }
  return { over: false };
}

export function isInCheck(fen: string): boolean {
  return new Chess(fen).isCheck();
}

export function trackImpostorPawn(
  fen: string,
  impostorSquare: string | null,
  lastMove: { from: string; to: string; promotion?: boolean } | null
): string | null {
  if (!impostorSquare || !lastMove) return impostorSquare;
  // If the pawn moved normally from its square, update tracked square
  if (lastMove.from === impostorSquare) {
    // Pawn promoted — no longer a pawn
    if (lastMove.promotion) return null;
    return lastMove.to;
  }
  // If the impostor pawn was captured (something moved to its square)
  if (lastMove.to === impostorSquare) {
    return null;
  }
  return impostorSquare;
}

export function trackSecuredPawns(
  fen: string,
  securedSquares: string[],
  lastMove: { from: string; to: string; promotion?: boolean } | null
): string[] {
  if (!securedSquares || securedSquares.length === 0 || !lastMove) {
    return securedSquares || [];
  }
  const chess = new Chess(fen);
  return securedSquares
    .map((sq) => {
      // If the secured pawn moved normally
      if (lastMove.from === sq) {
        if (lastMove.promotion) return null;
        return lastMove.to;
      }
      // If the secured pawn was captured directly
      if (lastMove.to === sq) {
        return null;
      }
      // If the secured pawn was captured en passant or otherwise removed
      const piece = chess.get(sq as any);
      if (!piece || piece.type !== "p") {
        return null;
      }
      return sq;
    })
    .filter((sq): sq is string => sq !== null);
}

export function isImpostorCaptured(fen: string, impostorSquare: string | null): boolean {
  if (!impostorSquare) return true;
  const chess = new Chess(fen);
  const piece = chess.get(impostorSquare as any);
  return !piece || piece.type !== "p";
}

function getAllSquares(): string[] {
  const squares: string[] = [];
  for (const f of FILES) {
    for (const r of RANKS) {
      squares.push(f + r);
    }
  }
  return squares;
}

export const VALID_IMPOSTOR_FILES = ["a", "b", "c", "f", "g", "h"];

export function getInitialPawnSquares(color: Color): string[] {
  const rank = color === "white" ? "2" : "7";
  return VALID_IMPOSTOR_FILES.map((f) => f + rank);
}

export function isValidImpostorSelection(
  pawnSquare: string,
  targetColor: Color,
  fen: string
): { valid: boolean; error?: string } {
  const file = pawnSquare[0];
  const rank = pawnSquare[1];
  const expectedRank = targetColor === "white" ? "2" : "7";

  if (!VALID_IMPOSTOR_FILES.includes(file)) {
    return { valid: false, error: "Invalid file. Must be a, b, c, f, g, or h" };
  }

  const chess = new Chess(fen);
  const piece = chess.get(pawnSquare as any);
  const chessColor = targetColor === "white" ? "w" : "b";

  if (!piece || piece.type !== "p" || piece.color !== chessColor) {
    return { valid: false, error: "No valid pawn at that square" };
  }

  return { valid: true };
}

export function switchFenTurn(fen: string, activeColor: Color): string {
  const parts = fen.split(" ");
  // Switch active turn flag
  parts[1] = parts[1] === "w" ? "b" : "w";
  // Reset en passant target square
  parts[3] = "-";
  // Increment halfmove clock
  parts[4] = String(parseInt(parts[4]) + 1);
  // Increment fullmove number if black was the active player whose turn just ended
  if (activeColor === "black") {
    parts[5] = String(parseInt(parts[5]) + 1);
  }
  return parts.join(" ");
}
