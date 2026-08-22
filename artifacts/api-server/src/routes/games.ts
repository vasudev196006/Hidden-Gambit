import { Router, type IRouter } from "express";
import type { Server as SocketServer } from "socket.io";
import { db, gamesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import {
  CreateGameBody,
  JoinGameParams,
  JoinGameBody,
  SetImpostorParams,
  SetImpostorBody,
  GetGameParams,
} from "@workspace/api-zod";
import { getGame, saveGame, createGameRecord, listActiveGames } from "../lib/gameStore";
import { isValidImpostorSelection } from "../lib/gameEngine";
import { buildGameState } from "../socket/gameSocket";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function generatePlayerId(): string {
  return crypto.randomUUID();
}

router.get("/games", async (req, res): Promise<void> => {
  try {
    const rawPlayerId = typeof req.query["playerId"] === "string" ? req.query["playerId"] : undefined;
    if (!rawPlayerId) {
      res.json([]);
      return;
    }
    const games = await listActiveGames();
    const myGames = games.filter(
      (g) => g.whitePlayerId === rawPlayerId || g.blackPlayerId === rawPlayerId
    );

    res.json(
      myGames.map((g) => ({
        id: g.id,
        status: g.status,
        whitePlayerName: g.whitePlayerName,
        blackPlayerName: g.blackPlayerName ?? null,
        createdAt: typeof g.createdAt === "string" ? g.createdAt : g.createdAt.toISOString(),
      }))
    );
  } catch (err: any) {
    req.log.error(err, "Failed to query games");
    res.status(500).json({ error: err.message });
  }
});

router.post("/games", async (req, res): Promise<void> => {
  const parsed = CreateGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const gameId = generateId();
  const playerId = generatePlayerId();

  const timeControl = (req.body as any)?.timeControl || "none";

  const game = await createGameRecord({
    id: gameId,
    whitePlayerId: playerId,
    whitePlayerName: parsed.data.playerName,
    status: "waiting",
    timeControl,
  });

  req.log.info({ gameId, playerId, timeControl }, "Game created");

  res.status(201).json({
    gameId: game.id,
    playerId,
    color: "white",
  });
});

router.get("/games/:id", async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const game = await getGame(params.data.id);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  // Accept optional ?playerId query param so the REST response includes myColor
  // Verify requestingPlayerId actually belongs to this game to prevent IDOR data leaks
  const rawPlayerId = typeof req.query["playerId"] === "string"
    ? req.query["playerId"]
    : undefined;
  const requestingPlayerId = (rawPlayerId === game.whitePlayerId || rawPlayerId === game.blackPlayerId)
    ? rawPlayerId
    : undefined;

  res.json(buildGameState(game, requestingPlayerId));
});

router.post("/games/:id/join", async (req, res): Promise<void> => {
  const params = JoinGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = JoinGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const game = await getGame(params.data.id);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  if (game.status !== "waiting") {
    res.status(400).json({ error: "Game is not available to join" });
    return;
  }

  const playerId = generatePlayerId();

  game.blackPlayerId = playerId;
  game.blackPlayerName = parsed.data.playerName;
  game.status = "selecting";

  const saved = await saveGame(game);

  req.log.info({ gameId: game.id, playerId }, "Player joined game");

  res.json({
    gameId: saved.id,
    playerId,
    color: "black",
  });
});

router.post("/games/:id/impostor", async (req, res): Promise<void> => {
  const params = SetImpostorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SetImpostorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const game = await getGame(params.data.id);
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  if (game.status !== "selecting") {
    res.status(400).json({ error: "Game is not in selection phase" });
    return;
  }

  const { playerId, pawnSquare } = parsed.data;

  const isWhite = playerId === game.whitePlayerId;
  const isBlack = playerId === game.blackPlayerId;

  if (!isWhite && !isBlack) {
    res.status(400).json({ error: "Not a player in this game" });
    return;
  }

  if (isWhite && game.whiteImpostorSquare) {
    res.status(400).json({ error: "Already selected an impostor" });
    return;
  }

  if (isBlack && game.blackImpostorSquare) {
    res.status(400).json({ error: "Already selected an impostor" });
    return;
  }

  // White selects an enemy (black) pawn; Black selects an enemy (white) pawn
  const targetColor = isWhite ? "black" : "white";
  const validation = isValidImpostorSelection(pawnSquare, targetColor, game.fen);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  if (isWhite) {
    game.whiteImpostorSquare = pawnSquare;
  } else {
    game.blackImpostorSquare = pawnSquare;
  }

  const bothReady = !!(game.whiteImpostorSquare && game.blackImpostorSquare);
  if (bothReady) {
    game.status = "active";
    const tc = game.timeControl ?? "none";
    if (tc === "3m") { game.whiteTimeMs = 180000; game.blackTimeMs = 180000; }
    else if (tc === "5m") { game.whiteTimeMs = 300000; game.blackTimeMs = 300000; }
    else if (tc === "10m") { game.whiteTimeMs = 600000; game.blackTimeMs = 600000; }
    else if (tc === "60s_turn") { game.whiteTimeMs = 60000; game.blackTimeMs = 60000; }
    if (tc !== "none") { game.turnStartedAt = new Date(); }
  }

  const saved = await saveGame(game);

  req.log.info({ gameId: game.id, playerId, pawnSquare, bothReady }, "Impostor selected");

  // Emit personalized game state to every socket in the room so both players
  // immediately see the transition (selecting → active) without waiting for a poll
  const io = req.app.locals["io"] as SocketServer | undefined;
  if (io) {
    const roomSockets = await io.in(game.id).fetchSockets();
    for (const s of roomSockets) {
      s.emit("gameState", buildGameState(saved, s.data.playerId));
    }
  }

  res.json({ success: true, bothReady });
});

export default router;
