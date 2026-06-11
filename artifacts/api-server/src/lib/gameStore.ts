import { db, gamesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Game } from "@workspace/db";
import { logger } from "./logger";

// In-memory cache for active games
const gameCache = new Map<string, Game>();

export async function getGame(gameId: string): Promise<Game | null> {
  if (gameCache.has(gameId)) {
    return gameCache.get(gameId)!;
  }
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
  if (game) {
    gameCache.set(gameId, game);
  }
  return game ?? null;
}

export async function saveGame(game: Game): Promise<Game> {
  const [updated] = await db
    .update(gamesTable)
    .set({
      status: game.status,
      fen: game.fen,
      turn: game.turn,
      blackPlayerId: game.blackPlayerId,
      blackPlayerName: game.blackPlayerName,
      whiteImpostorSquare: game.whiteImpostorSquare,
      blackImpostorSquare: game.blackImpostorSquare,
      whiteImpostorUsed: game.whiteImpostorUsed,
      blackImpostorUsed: game.blackImpostorUsed,
      whiteImpostorRevealed: game.whiteImpostorRevealed,
      blackImpostorRevealed: game.blackImpostorRevealed,
      whiteInvestigationUsed: game.whiteInvestigationUsed,
      blackInvestigationUsed: game.blackInvestigationUsed,
      securedSquares: game.securedSquares,
      lastEvent: game.lastEvent,
      winner: game.winner,
      moveCount: game.moveCount,
      moveHistory: game.moveHistory,
      updatedAt: new Date(),
    })
    .where(eq(gamesTable.id, game.id))
    .returning();

  if (updated) {
    gameCache.set(updated.id, updated);
    return updated;
  }

  logger.warn({ gameId: game.id }, "Failed to save game");
  return game;
}

export function invalidateCache(gameId: string): void {
  gameCache.delete(gameId);
}
