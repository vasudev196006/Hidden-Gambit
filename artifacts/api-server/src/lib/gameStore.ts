import { db, gamesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import type { Game } from "@workspace/db";
import { logger } from "./logger";

// In-memory cache for active games (acts as zero-downtime fallback if DB is offline/paused)
const gameCache = new Map<string, Game>();

export async function getGame(gameId: string): Promise<Game | null> {
  if (gameCache.has(gameId)) {
    return gameCache.get(gameId)!;
  }
  try {
    const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, gameId));
    if (game) {
      gameCache.set(gameId, game);
    }
    return game ?? null;
  } catch (err: any) {
    logger.warn({ gameId, error: err.message }, "Database query failed, using in-memory cache fallback");
    return gameCache.get(gameId) ?? null;
  }
}

export async function saveGame(game: Game): Promise<Game> {
  // Always update in-memory cache first
  gameCache.set(game.id, game);

  try {
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
        penaltyTargetColor: game.penaltyTargetColor,
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
  } catch (err: any) {
    logger.warn({ gameId: game.id, error: err.message }, "Database save failed, operating in in-memory mode");
  }

  return game;
}

export async function createGameRecord(gameData: {
  id: string;
  whitePlayerId: string;
  whitePlayerName: string;
  status: string;
}): Promise<Game> {
  const newGame: Game = {
    id: gameData.id,
    status: gameData.status as any,
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    turn: "white",
    whitePlayerId: gameData.whitePlayerId,
    whitePlayerName: gameData.whitePlayerName,
    blackPlayerId: null,
    blackPlayerName: null,
    whiteImpostorSquare: null,
    blackImpostorSquare: null,
    whiteImpostorUsed: false,
    blackImpostorUsed: false,
    whiteImpostorRevealed: null,
    blackImpostorRevealed: null,
    whiteInvestigationUsed: false,
    blackInvestigationUsed: false,
    securedSquares: [],
    lastEvent: null,
    winner: null,
    penaltyTargetColor: null,
    moveCount: 0,
    moveHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  gameCache.set(newGame.id, newGame);

  try {
    const [created] = await db
      .insert(gamesTable)
      .values({
        id: gameData.id,
        whitePlayerId: gameData.whitePlayerId,
        whitePlayerName: gameData.whitePlayerName,
        status: gameData.status as any,
      })
      .returning();

    if (created) {
      gameCache.set(created.id, created);
      return created;
    }
  } catch (err: any) {
    logger.warn({ gameId: newGame.id, error: err.message }, "Database insert failed, operating in in-memory mode");
  }

  return newGame;
}

export async function listActiveGames(): Promise<Game[]> {
  try {
    const games = await db
      .select()
      .from(gamesTable)
      .where(or(eq(gamesTable.status, "waiting"), eq(gamesTable.status, "active")));

    for (const g of games) {
      gameCache.set(g.id, g);
    }
    return games;
  } catch (err: any) {
    logger.warn({ error: err.message }, "Database list query failed, returning in-memory active games");
    return Array.from(gameCache.values()).filter(g => g.status === "waiting" || g.status === "active");
  }
}

export function invalidateCache(gameId: string): void {
  gameCache.delete(gameId);
}
