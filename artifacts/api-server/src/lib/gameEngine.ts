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

export function getImpostorMoves(fromSquare: string, moveType: MoveType): string[] {
  const [file, rank] = squareToCoords(fromSquare);
  const destinations: string[] = [];

  if (moveType === "knight") {
    const knightDeltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [df, dr] of knightDeltas) {
      const sq = coordsToSquare(file + df, rank + dr);
      if (sq) destinations.push(sq);
    }
  } else {
    // Bishop move = one square diagonal in any direction
    const bishopDeltas = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [df, dr] of bishopDeltas) {
      const sq = coordsToSquare(file + df, rank + dr);
      if (sq) destinations.push(sq);
    }
  }

  return destinations;
}

export function isValidImpostorMove(
  fromSquare: string,
  toSquare: string,
  moveType: MoveType,
  fen: string,
  impostorColor: Color
): { valid: boolean; error?: string } {
  const chess = new Chess(fen);
  const impostorPiece = chess.get(fromSquare as any);

  if (!impostorPiece) {
    return { valid: false, error: "Impostor pawn no longer exists" };
  }
  if (impostorPiece.type !== "p") {
    return { valid: false, error: "Impostor is not a pawn" };
  }

  const validDestinations = getImpostorMoves(fromSquare, moveType);
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
  // Increment half-move clock
  parts[4] = "0"; // capture resets it
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
    const chess = new Chess(fen);
    const piece = chess.get(impostorSquare as any);
    if (!piece) return null; // captured — en passant
  }
  return impostorSquare;
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
