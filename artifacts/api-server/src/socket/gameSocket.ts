import type { Server as SocketServer, Socket } from "socket.io";
import { getGame, saveGame } from "../lib/gameStore";
import {
  applyStandardMove,
  applyImpostorMove,
  applyInvestigationPenalty,
  checkGameOver,
  isValidImpostorMove,
  trackImpostorPawn,
  isImpostorCaptured,
  isInCheck,
  getValidMoves,
} from "../lib/gameEngine";
import { logger } from "../lib/logger";

export function buildGameState(game: any, requestingPlayerId?: string) {
  const isWhite = requestingPlayerId === game.whitePlayerId;
  const isBlack = requestingPlayerId === game.blackPlayerId;
  const myColor = isWhite ? "white" : isBlack ? "black" : null;

  const history = (game.moveHistory as any[]) ?? [];
  const lastEntry = history[history.length - 1];

  return {
    id: game.id,
    status: game.status,
    fen: game.fen,
    turn: game.turn,
    whitePlayerName: game.whitePlayerName,
    blackPlayerName: game.blackPlayerName ?? null,
    myColor,
    myImpostorSquare:
      isWhite ? game.whiteImpostorSquare ?? null :
      isBlack ? game.blackImpostorSquare ?? null : null,
    impostorReady: !!(game.whiteImpostorSquare && game.blackImpostorSquare),
    whiteImpostorUsed: game.whiteImpostorUsed,
    blackImpostorUsed: game.blackImpostorUsed,
    whiteImpostorRevealed: game.whiteImpostorRevealed ?? null,
    blackImpostorRevealed: game.blackImpostorRevealed ?? null,
    whiteInvestigationUsed: game.whiteInvestigationUsed,
    blackInvestigationUsed: game.blackInvestigationUsed,
    securedSquares: game.securedSquares ?? [],
    lastEvent: game.lastEvent ?? null,
    winner: game.winner ?? null,
    moveCount: game.moveCount,
    lastMoveFrom: lastEntry?.from ?? null,
    lastMoveTo: lastEntry?.to ?? null,
  };
}

export function registerGameSocket(io: SocketServer): void {
  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("joinRoom", async ({ gameId, playerId }: { gameId: string; playerId: string }) => {
      const game = await getGame(gameId);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }
      socket.join(gameId);
      socket.data.gameId = gameId;
      socket.data.playerId = playerId;
      socket.emit("gameState", buildGameState(game, playerId));
      logger.info({ gameId, playerId }, "Player joined room");
    });

    socket.on("makeMove", async ({
      gameId,
      playerId,
      from,
      to,
      promotion,
    }: {
      gameId: string;
      playerId: string;
      from: string;
      to: string;
      promotion?: string;
    }) => {
      const game = await getGame(gameId);
      if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
      if (game.status !== "active") { socket.emit("moveError", { message: "Game is not active" }); return; }

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player in this game" }); return; }

      const playerColor = isWhite ? "white" : "black";
      if (game.turn !== playerColor) { socket.emit("moveError", { message: "Not your turn" }); return; }

      // Apply standard chess move with secured pawn protection
      const result = applyStandardMove(game.fen, from, to, promotion, game.securedSquares);
      if (result.error) { socket.emit("moveError", { message: result.error }); return; }

      game.fen = result.newFen;
      game.turn = game.turn === "white" ? "black" : "white";
      game.moveCount += 1;
      game.lastEvent = null;
      const history = (game.moveHistory as any[]) ?? [];
      history.push({ from, to, promotion, player: playerColor });
      game.moveHistory = history as any;

      // Track impostor pawn location after move
      game.whiteImpostorSquare = trackImpostorPawn(
        game.fen,
        game.whiteImpostorSquare,
        { from, to, promotion: !!result.promotion }
      );
      game.blackImpostorSquare = trackImpostorPawn(
        game.fen,
        game.blackImpostorSquare,
        { from, to, promotion: !!result.promotion }
      );

      // Check if impostors were captured
      if (game.whiteImpostorSquare && isImpostorCaptured(game.fen, game.whiteImpostorSquare)) {
        game.whiteImpostorSquare = null;
      }
      if (game.blackImpostorSquare && isImpostorCaptured(game.fen, game.blackImpostorSquare)) {
        game.blackImpostorSquare = null;
      }

      // Check game over
      const gameOver = checkGameOver(game.fen);
      if (gameOver.over) {
        game.status = "finished";
        game.winner = gameOver.winner ?? null;
      }

      const saved = await saveGame(game);
      io.to(gameId).emit("gameState", buildGameState(saved, playerId));
      io.to(gameId).emit("gameStateForOpponent", buildGameState(saved,
        isWhite ? game.blackPlayerId ?? undefined : game.whitePlayerId
      ));

      // Broadcast to all in room with correct per-player state
      const sockets = await io.in(gameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("activateImpostor", async ({
      gameId,
      playerId,
      fromSquare,
      toSquare,
      moveType,
    }: {
      gameId: string;
      playerId: string;
      fromSquare: string;
      toSquare: string;
      moveType: "knight" | "bishop";
    }) => {
      const game = await getGame(gameId);
      if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
      if (game.status !== "active") { socket.emit("moveError", { message: "Game is not active" }); return; }

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player in this game" }); return; }

      const playerColor = isWhite ? "white" : "black";
      if (game.turn !== playerColor) { socket.emit("moveError", { message: "Not your turn" }); return; }

      // Check impostor hasn't been used
      if (isWhite && game.whiteImpostorUsed) { socket.emit("moveError", { message: "Impostor already used" }); return; }
      if (isBlack && game.blackImpostorUsed) { socket.emit("moveError", { message: "Impostor already used" }); return; }

      // Check impostor pawn still exists
      const impostorSquare = isWhite ? game.whiteImpostorSquare : game.blackImpostorSquare;
      if (!impostorSquare) { socket.emit("moveError", { message: "Impostor pawn was captured" }); return; }
      if (fromSquare !== impostorSquare) { socket.emit("moveError", { message: "Wrong pawn — not the impostor" }); return; }

      // Validate the impostor move
      const validation = isValidImpostorMove(fromSquare, toSquare, moveType, game.fen, playerColor);
      if (!validation.valid) { socket.emit("moveError", { message: validation.error }); return; }

      // Apply impostor move
      const newFen = applyImpostorMove(game.fen, fromSquare, toSquare, playerColor);
      game.fen = newFen;
      game.turn = game.turn === "white" ? "black" : "white";
      game.moveCount += 1;

      if (isWhite) {
        game.whiteImpostorUsed = true;
        game.whiteImpostorRevealed = toSquare;
        game.whiteImpostorSquare = null;
        game.lastEvent = `White's impostor pawn activated a ${moveType} move from ${fromSquare} to ${toSquare}!`;
      } else {
        game.blackImpostorUsed = true;
        game.blackImpostorRevealed = toSquare;
        game.blackImpostorSquare = null;
        game.lastEvent = `Black's impostor pawn activated a ${moveType} move from ${fromSquare} to ${toSquare}!`;
      }

      const history = (game.moveHistory as any[]) ?? [];
      history.push({ from: fromSquare, to: toSquare, moveType, impostor: true, player: playerColor });
      game.moveHistory = history as any;

      // Check game over after impostor move
      const gameOver = checkGameOver(game.fen);
      if (gameOver.over) {
        game.status = "finished";
        game.winner = gameOver.winner ?? null;
      }

      const saved = await saveGame(game);
      const sockets = await io.in(gameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("investigate", async ({
      gameId,
      playerId,
      suspectSquare,
    }: {
      gameId: string;
      playerId: string;
      suspectSquare: string;
    }) => {
      const game = await getGame(gameId);
      if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
      if (game.status !== "active") { socket.emit("moveError", { message: "Game is not active" }); return; }

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player in this game" }); return; }

      const playerColor = isWhite ? "white" : "black";
      if (game.turn !== playerColor) { socket.emit("moveError", { message: "Not your turn" }); return; }

      if (isWhite && game.whiteInvestigationUsed) { socket.emit("moveError", { message: "Investigation already used" }); return; }
      if (isBlack && game.blackInvestigationUsed) { socket.emit("moveError", { message: "Investigation already used" }); return; }

      // Mark investigation as used
      if (isWhite) game.whiteInvestigationUsed = true;
      else game.blackInvestigationUsed = true;

      // The opponent's impostor is the one we're hunting
      // White investigates to find Black's impostor selection (which black pawn is white's impostor)
      // = white is hunting for the pawn in white's own pieces that black secretly controls
      // = the white impostor square IS the black-selected pawn
      const opponentImpostorSquare = isWhite ? game.blackImpostorSquare : game.whiteImpostorSquare;

      if (suspectSquare === opponentImpostorSquare) {
        // CORRECT investigation
        const secured = [...game.securedSquares, suspectSquare];
        game.securedSquares = secured;
        game.lastEvent = isWhite
          ? `White correctly identified the impostor at ${suspectSquare}! That pawn is now secured.`
          : `Black correctly identified the impostor at ${suspectSquare}! That pawn is now secured.`;

        // Reveal the impostor to everyone
        if (isWhite) game.blackImpostorRevealed = suspectSquare;
        else game.whiteImpostorRevealed = suspectSquare;
      } else {
        // WRONG investigation — penalty: lose 1 knight + 1 bishop
        const playerColor = isWhite ? "white" : "black";
        const newFen = applyInvestigationPenalty(game.fen, playerColor);
        game.fen = newFen;
        game.lastEvent = isWhite
          ? `White wrongly investigated ${suspectSquare}. White loses a knight and a bishop!`
          : `Black wrongly investigated ${suspectSquare}. Black loses a knight and a bishop!`;
      }

      const saved = await saveGame(game);
      const sockets = await io.in(gameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("resign", async ({ gameId, playerId }: { gameId: string; playerId: string }) => {
      const game = await getGame(gameId);
      if (!game || game.status !== "active") return;

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) return;

      game.status = "finished";
      game.winner = isWhite ? "black" : "white";
      game.lastEvent = `${isWhite ? "White" : "Black"} resigned.`;

      const saved = await saveGame(game);
      const sockets = await io.in(gameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });
}
