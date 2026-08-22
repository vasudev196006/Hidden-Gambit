import type { Server as SocketServer, Socket } from "socket.io";
import { getGame, saveGame } from "../lib/gameStore";
import {
  applyStandardMove,
  applyImpostorMove,
  applyInvestigationPenalty,
  removePieceOfType,
  hasKnightOrBishop,
  checkGameOver,
  isValidImpostorMove,
  trackImpostorPawn,
  trackRevealedPiece,
  trackSecuredPawns,
  isImpostorCaptured,
  isInCheck,
  getValidMoves,
  switchFenTurn,
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
    penaltyTargetColor: game.penaltyTargetColor ?? null,
    moveCount: game.moveCount,
    lastMoveFrom: lastEntry?.from ?? null,
    lastMoveTo: lastEntry?.to ?? null,
    moveHistory: history,
    timeControl: game.timeControl ?? "none",
    whiteTimeMs: game.whiteTimeMs ?? null,
    blackTimeMs: game.blackTimeMs ?? null,
    turnStartedAt: game.turnStartedAt ? new Date(game.turnStartedAt).getTime() : null,
    rematchRequestedBy: game.rematchRequestedBy ?? null,
  };
}

function deductTurnClock(game: any) {
  if (game.status === "active" && game.timeControl && game.timeControl !== "none" && game.turnStartedAt) {
    const elapsed = Date.now() - new Date(game.turnStartedAt).getTime();
    if (game.timeControl === "60s_turn") {
      if (game.turn === "white") game.whiteTimeMs = 60000;
      else game.blackTimeMs = 60000;
    } else {
      if (game.turn === "white" && game.whiteTimeMs != null) {
        game.whiteTimeMs = Math.max(0, game.whiteTimeMs - elapsed);
      } else if (game.turn === "black" && game.blackTimeMs != null) {
        game.blackTimeMs = Math.max(0, game.blackTimeMs - elapsed);
      }
    }
  }
  game.turnStartedAt = new Date();
}

function getAuthorizedPlayerId(socket: Socket, payloadPlayerId?: string): { playerId: string | null; error?: string } {
  const boundId = socket.data?.playerId;
  if (boundId && payloadPlayerId && boundId !== payloadPlayerId) {
    return { playerId: null, error: "Unauthorized: Player identity mismatch (IDOR attempt blocked)" };
  }
  const playerId = boundId || payloadPlayerId || null;
  if (!playerId) {
    return { playerId: null, error: "Unauthorized: Missing player identification" };
  }
  return { playerId };
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

      // Broadcast updated state to EVERY socket in the room (not just the joiner).
      // This is what wakes up Player 1 when Player 2 connects after a REST join.
      const roomSockets = await io.in(gameId).fetchSockets();
      logger.info({ gameId, playerId, roomSize: roomSockets.length }, "Player joined room — broadcasting to all");
      for (const s of roomSockets) {
        s.emit("gameState", buildGameState(game, s.data.playerId));
      }
    });

    socket.on("makeMove", async ({
      gameId,
      playerId: rawPlayerId,
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
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) {
        socket.emit("moveError", { message: auth.error });
        return;
      }
      const playerId = auth.playerId;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
      if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
      if (game.status !== "active") {
        socket.emit("moveError", { message: "Game is not active" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }
      if (game.penaltyTargetColor) {
        socket.emit("moveError", { message: "Cannot move: penalty choice is pending" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player in this game" }); return; }

      const playerColor = isWhite ? "white" : "black";
      if (game.turn !== playerColor) {
        socket.emit("moveError", { message: "Not your turn" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      // Apply standard chess move with secured pawn protection
      const result = applyStandardMove(game.fen, from, to, promotion, game.securedSquares);
      if (result.error) {
        socket.emit("moveError", { message: result.error });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      game.fen = result.newFen;
      game.turn = game.turn === "white" ? "black" : "white";
      game.moveCount += 1;
      deductTurnClock(game);
      const promotionSuffix = result.promotion && promotion ? ` (promoted to ${promotion === "q" ? "queen" : promotion === "r" ? "rook" : promotion === "b" ? "bishop" : "knight"})` : "";
      game.lastEvent = `${playerColor === "white" ? "White" : "Black"} moved from ${from} to ${to}${promotionSuffix}`;
      const history = (game.moveHistory as any[]) ?? [];
      history.push({ from, to, promotion: result.promotion ? promotion : undefined, player: playerColor });
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

      // Track secured pawn locations after move
      game.securedSquares = trackSecuredPawns(
        game.fen,
        game.securedSquares || [],
        { from, to, promotion: !!result.promotion }
      );

      // Check if impostors were captured
      if (game.whiteImpostorSquare && isImpostorCaptured(game.fen, game.whiteImpostorSquare)) {
        game.whiteImpostorSquare = null;
      }
      if (game.blackImpostorSquare && isImpostorCaptured(game.fen, game.blackImpostorSquare)) {
        game.blackImpostorSquare = null;
      }

      // Track revealed impostor pieces (follow them as they move normally)
      game.whiteImpostorRevealed = trackRevealedPiece(game.whiteImpostorRevealed, { from, to });
      game.blackImpostorRevealed = trackRevealedPiece(game.blackImpostorRevealed, { from, to });

      // Check game over
      const gameOver = checkGameOver(game.fen);
      if (gameOver.over) {
        game.status = "finished";
        game.winner = gameOver.winner ?? null;
      }

      const saved = await saveGame(game);
      // Always broadcast with each socket's own playerId so myColor is never wrong
      const sockets = await io.in(gameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("activateImpostor", async ({
      gameId,
      playerId: rawPlayerId,
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
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) {
        socket.emit("moveError", { message: auth.error });
        return;
      }
      const playerId = auth.playerId;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
      if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
      if (game.status !== "active") {
        socket.emit("moveError", { message: "Game is not active" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }
      if (game.penaltyTargetColor) {
        socket.emit("moveError", { message: "Cannot activate impostor: penalty choice is pending" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player in this game" }); return; }

      const playerColor = isWhite ? "white" : "black";
      if (game.turn !== playerColor) {
        socket.emit("moveError", { message: "Not your turn" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      // Check impostor hasn't been used
      if (isWhite && game.whiteImpostorUsed) {
        socket.emit("moveError", { message: "Impostor already used" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }
      if (isBlack && game.blackImpostorUsed) {
        socket.emit("moveError", { message: "Impostor already used" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      // Check impostor pawn still exists
      const impostorSquare = isWhite ? game.whiteImpostorSquare : game.blackImpostorSquare;
      if (!impostorSquare) {
        const isRevealed = isWhite ? game.whiteImpostorRevealed : game.blackImpostorRevealed;
        const errMsg = isRevealed
          ? "Impostor pawn was neutralized by investigation"
          : "Impostor pawn was captured";
        socket.emit("moveError", { message: errMsg });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }
      if (fromSquare !== impostorSquare) {
        socket.emit("moveError", { message: "Wrong pawn — not the impostor" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      // Validate the impostor move
      const validation = isValidImpostorMove(fromSquare, toSquare, moveType, game.fen, playerColor, game.securedSquares);
      if (!validation.valid) {
        socket.emit("moveError", { message: validation.error });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      // Apply impostor move (pawn transforms into the piece type used)
      const newFen = applyImpostorMove(game.fen, fromSquare, toSquare, playerColor, moveType);
      game.fen = newFen;
      game.turn = game.turn === "white" ? "black" : "white";
      game.moveCount += 1;

      // Track secured pawn locations after impostor move
      game.securedSquares = trackSecuredPawns(
        game.fen,
        game.securedSquares || [],
        { from: fromSquare, to: toSquare, promotion: false }
      );

      // Track revealed impostor pieces (in case this impostor captures the other's revealed piece)
      game.whiteImpostorRevealed = trackRevealedPiece(game.whiteImpostorRevealed, { from: fromSquare, to: toSquare });
      game.blackImpostorRevealed = trackRevealedPiece(game.blackImpostorRevealed, { from: fromSquare, to: toSquare });

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
      playerId: rawPlayerId,
      suspectSquare,
    }: {
      gameId: string;
      playerId: string;
      suspectSquare: string;
    }) => {
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) {
        socket.emit("moveError", { message: auth.error });
        return;
      }
      const playerId = auth.playerId;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
      if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
      if (game.status !== "active") {
        socket.emit("moveError", { message: "Game is not active" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }
      if (game.penaltyTargetColor) {
        socket.emit("moveError", { message: "Cannot investigate: penalty choice is pending" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player in this game" }); return; }

      const playerColor = isWhite ? "white" : "black";
      if (game.turn !== playerColor) {
        socket.emit("moveError", { message: "Not your turn" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      if (isWhite && game.whiteInvestigationUsed) {
        socket.emit("moveError", { message: "Investigation already used" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }
      if (isBlack && game.blackInvestigationUsed) {
        socket.emit("moveError", { message: "Investigation already used" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      const opponentImpostorUsed = isWhite ? game.blackImpostorUsed : game.whiteImpostorUsed;
      if (opponentImpostorUsed) {
        socket.emit("moveError", { message: "Cannot investigate: opponent's impostor has already been activated" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

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

        // Reveal the impostor to everyone and strip of impostor powers
        if (isWhite) {
          game.blackImpostorRevealed = suspectSquare;
          game.blackImpostorSquare = null;
        } else {
          game.whiteImpostorRevealed = suspectSquare;
          game.whiteImpostorSquare = null;
        }
      } else {
        // WRONG investigation — check if they have pieces to lose
        const playerColor = isWhite ? "white" : "black";
        const opponentColor = isWhite ? "black" : "white";
        const targetName = isWhite ? game.whitePlayerName : (game.blackPlayerName ?? "Black");
        const opponentName = isWhite ? (game.blackPlayerName ?? "Black") : game.whitePlayerName;

        // Switch turn to the opponent on failed investigation
        game.turn = opponentColor;
        game.fen = switchFenTurn(game.fen, playerColor);
        game.moveCount += 1;

        const pieces = hasKnightOrBishop(game.fen, playerColor);
        if (!pieces.knight && !pieces.bishop) {
          game.lastEvent = `${targetName} wrongly investigated ${suspectSquare}, but has no knight or bishop to lose! Turn passed to ${opponentName}.`;
        } else {
          game.penaltyTargetColor = playerColor;
          game.lastEvent = `${targetName} wrongly investigated ${suspectSquare}. Turn passed to ${opponentName}, who must choose a piece to remove!`;
        }
      }

      const history = (game.moveHistory as any[]) ?? [];
      history.push({
        type: "investigation",
        player: playerColor,
        square: suspectSquare,
        success: suspectSquare === opponentImpostorSquare,
      });
      game.moveHistory = history as any;

      const saved = await saveGame(game);
      const sockets = await io.in(gameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("selectPenalty", async ({
      gameId,
      playerId: rawPlayerId,
      square,
    }: {
      gameId: string;
      playerId: string;
      square: string;
    }) => {
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) {
        socket.emit("moveError", { message: auth.error });
        return;
      }
      const playerId = auth.playerId;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
      if (!game) { socket.emit("moveError", { message: "Game not found" }); return; }
      if (game.status !== "active") {
        socket.emit("moveError", { message: "Game is not active" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }
      if (!game.penaltyTargetColor) {
        socket.emit("moveError", { message: "No penalty choice is pending" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) { socket.emit("moveError", { message: "Not a player in this game" }); return; }

      const playerColor = isWhite ? "white" : "black";
      const choosingColor = game.penaltyTargetColor === "white" ? "black" : "white";
      if (playerColor !== choosingColor) {
        socket.emit("moveError", { message: "Not your turn to choose penalty" });
        socket.emit("gameState", buildGameState(game, playerId));
        return;
      }

      const Chess = require("chess.js").Chess; // Import inside or rely on top level imports
      const chess = new Chess(game.fen);
      const piece = chess.get(square as any);
      const penalizedColor = game.penaltyTargetColor as "white" | "black";
      const targetChessColor = penalizedColor === "white" ? "w" : "b";

      if (!piece || piece.color !== targetChessColor || (piece.type !== "n" && piece.type !== "b")) {
        socket.emit("moveError", { message: "Invalid piece chosen for removal" });
        return;
      }

      const pieceType = piece.type;
      const penaltyChoice = pieceType === "n" ? "knight" : "bishop";

      chess.remove(square as any);
      game.fen = chess.fen();

      const penalizedName = penalizedColor === "white" ? game.whitePlayerName : (game.blackPlayerName ?? "Black");
      const choosingName = playerColor === "white" ? game.whitePlayerName : (game.blackPlayerName ?? "Black");

      game.penaltyTargetColor = null;
      game.lastEvent = `${choosingName} removed ${penalizedName}'s ${penaltyChoice} on ${square}!`;

      const history = (game.moveHistory as any[]) ?? [];
      history.push({
        type: "penalty",
        player: playerColor,
        square,
        pieceType: penaltyChoice,
      });
      game.moveHistory = history as any;

      const saved = await saveGame(game);
      const sockets = await io.in(gameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("resign", async ({ gameId, playerId: rawPlayerId }: { gameId: string; playerId: string }) => {
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) {
        socket.emit("moveError", { message: auth.error });
        return;
      }
      const playerId = auth.playerId;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
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

    socket.on("sendEmote", async ({ gameId, playerId: rawPlayerId, emote }: { gameId: string; playerId: string; emote: string }) => {
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) return;
      const playerId = auth.playerId;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
      if (!game) return;

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) return;

      const color = isWhite ? "white" : "black";
      io.in(effectiveGameId).emit("emoteReceived", { playerId, color, emote, id: Date.now() });
    });

    socket.on("requestRematch", async ({ gameId, playerId: rawPlayerId }: { gameId: string; playerId: string }) => {
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) return;
      const playerId = auth.playerId;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
      if (!game || game.status !== "finished") return;

      const isWhite = playerId === game.whitePlayerId;
      const isBlack = playerId === game.blackPlayerId;
      if (!isWhite && !isBlack) return;

      if (!game.rematchRequestedBy) {
        game.rematchRequestedBy = playerId;
        game.lastEvent = `${isWhite ? game.whitePlayerName : game.blackPlayerName} requested a rematch!`;
      } else if (game.rematchRequestedBy !== playerId) {
        const oldWhiteId = game.whitePlayerId;
        const oldWhiteName = game.whitePlayerName;
        const oldBlackId = game.blackPlayerId;
        const oldBlackName = game.blackPlayerName;

        game.whitePlayerId = oldBlackId!;
        game.whitePlayerName = oldBlackName!;
        game.blackPlayerId = oldWhiteId;
        game.blackPlayerName = oldWhiteName;

        game.status = "selecting";
        game.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        game.turn = "white";
        game.whiteImpostorSquare = null;
        game.blackImpostorSquare = null;
        game.whiteImpostorUsed = false;
        game.blackImpostorUsed = false;
        game.whiteImpostorRevealed = null;
        game.blackImpostorRevealed = null;
        game.whiteInvestigationUsed = false;
        game.blackInvestigationUsed = false;
        game.securedSquares = [];
        game.winner = null;
        game.penaltyTargetColor = null;
        game.moveCount = 0;
        game.moveHistory = [];
        game.rematchRequestedBy = null;
        game.lastEvent = "Rematch accepted! Select your new secret impostor.";

        if (game.timeControl === "3m") {
          game.whiteTimeMs = 180000;
          game.blackTimeMs = 180000;
        } else if (game.timeControl === "5m") {
          game.whiteTimeMs = 300000;
          game.blackTimeMs = 300000;
        } else if (game.timeControl === "10m") {
          game.whiteTimeMs = 600000;
          game.blackTimeMs = 600000;
        } else if (game.timeControl === "60s_turn") {
          game.whiteTimeMs = 60000;
          game.blackTimeMs = 60000;
        }
      }

      const saved = await saveGame(game);
      const sockets = await io.in(effectiveGameId).fetchSockets();
      for (const s of sockets) {
        s.emit("gameState", buildGameState(saved, s.data.playerId));
      }
    });

    socket.on("checkTimeout", async ({ gameId, playerId: rawPlayerId }: { gameId: string; playerId: string }) => {
      const auth = getAuthorizedPlayerId(socket, rawPlayerId);
      if (auth.error || !auth.playerId) return;
      const effectiveGameId = socket.data.gameId || gameId;

      const game = await getGame(effectiveGameId);
      if (!game || game.status !== "active" || game.timeControl === "none" || !game.turnStartedAt) return;

      const elapsed = Date.now() - new Date(game.turnStartedAt).getTime();
      let timedOut = false;
      let losingColor: "white" | "black" = "white";

      if (game.timeControl === "60s_turn") {
        if (elapsed >= 60000) {
          timedOut = true;
          losingColor = game.turn as "white" | "black";
        }
      } else {
        const currentRemaining = game.turn === "white" ? game.whiteTimeMs! : game.blackTimeMs!;
        if (currentRemaining - elapsed <= 0) {
          timedOut = true;
          losingColor = game.turn as "white" | "black";
        }
      }

      if (timedOut) {
        game.status = "finished";
        game.winner = losingColor === "white" ? "black" : "white";
        game.lastEvent = `${losingColor === "white" ? game.whitePlayerName : game.blackPlayerName} ran out of time!`;
        const saved = await saveGame(game);
        const sockets = await io.in(effectiveGameId).fetchSockets();
        for (const s of sockets) {
          s.emit("gameState", buildGameState(saved, s.data.playerId));
        }
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });
}
