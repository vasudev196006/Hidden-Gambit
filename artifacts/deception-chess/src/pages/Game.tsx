import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useSetImpostor } from "@workspace/api-client-react";
import type { GameState } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs } from "react-chessboard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, AlertTriangle, Shield, Swords, ArrowLeft,
  Zap, Search, ChevronRight, X, Copy, CheckCircle2,
  Volume2, VolumeX, Settings,
} from "lucide-react";
import { soundManager } from "@/lib/soundEffects";
import { getStoredTheme, BoardTheme } from "@/lib/boardTheme";
import { recordMatchResult } from "@/lib/playerProfile";
import { SettingsModal } from "@/components/launcher/SettingsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImpostorPhase = "idle" | "pickMoveType" | "pickDestination";

const KNIGHT_DELTAS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
const BISHOP_DELTAS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const FILES = ["a","b","c","d","e","f","g","h"];
const RANKS = ["1","2","3","4","5","6","7","8"];

function squareToCoords(sq: string): [number,number] {
  return [FILES.indexOf(sq[0]), RANKS.indexOf(sq[1])];
}
function coordsToSquare(f: number, r: number): string | null {
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return FILES[f] + RANKS[r];
}
function getImpostorTargets(
  from: string,
  moveType: "knight" | "bishop",
  myColor: "white" | "black",
  fen?: string,
  securedSquares: string[] = []
): string[] {
  const [f, r] = squareToCoords(from);
  const destinations: string[] = [];
  const chess = fen ? new Chess(fen) : null;
  const playerChessColor = myColor === "white" ? "w" : "b";

  if (moveType === "knight") {
    const knightDeltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [df, dr] of knightDeltas) {
      const sq = coordsToSquare(f + df, r + dr);
      if (sq) {
        if (chess) {
          const piece = chess.get(sq as any);
          // Cannot capture own piece or King
          if (piece && (piece.color === playerChessColor || piece.type === "k")) {
            continue;
          }
        }
        destinations.push(sq);
      }
    }
  } else {
    // Bishop move = slide diagonally in all 4 directions (standard bishop move)
    const directions = [
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    for (const [df, dr] of directions) {
      let step = 1;
      while (true) {
        const nextFile = f + df * step;
        const nextRank = r + dr * step;
        const sq = coordsToSquare(nextFile, nextRank);
        if (!sq) break; // off board

        if (chess) {
          const piece = chess.get(sq as any);
          if (!piece) {
            destinations.push(sq);
          } else {
            // Cannot capture own piece or King
            if (piece.color !== playerChessColor && piece.type !== "k") {
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

export default function Game() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Impostor activation state
  const [impostorPhase, setImpostorPhase] = useState<ImpostorPhase>("idle");
  const [impostorMoveType, setImpostorMoveType] = useState<"knight" | "bishop" | null>(null);
  const [impostorTargets, setImpostorTargets] = useState<string[]>([]);

  // Investigation state
  const [investigateMode, setInvestigateMode] = useState(false);
  const [investigateTarget, setInvestigateTarget] = useState<string | null>(null);
  const [investigateDialogOpen, setInvestigateDialogOpen] = useState(false);

  // Penalty selection state
  const [penaltySelectionType, setPenaltySelectionType] = useState<"knight" | "bishop" | null>(null);

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Drag-start square (for showing move hints during drag)
  const [dragSquare, setDragSquare] = useState<string | null>(null);

  // Pawn promotion state
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Last move highlight
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Dynamic board color theme state
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(() => getStoredTheme());

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEv = e as CustomEvent<BoardTheme>;
      if (customEv.detail) {
        setBoardTheme(customEv.detail);
      } else {
        setBoardTheme(getStoredTheme());
      }
    };
    window.addEventListener("boardThemeChanged", handleThemeChange);
    return () => window.removeEventListener("boardThemeChanged", handleThemeChange);
  }, []);

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Read playerId — sessionStorage is per-tab (no cross-tab collision)
  const storedPlayerId = id ? (sessionStorage.getItem(`game_${id}_player`) ?? undefined) : undefined;

  const GAME_QUERY_KEY = ["game", id, storedPlayerId];

  const { data: initialData, isLoading } = useQuery<GameState>({
    queryKey: GAME_QUERY_KEY,
    queryFn: async () => {
      const url = storedPlayerId
        ? `/api/games/${id}?playerId=${storedPlayerId}`
        : `/api/games/${id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch game");
      return res.json();
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "waiting" || status === "selecting" ? 2000 : false;
    },
  });

  const setImpostor = useSetImpostor();

  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  useEffect(() => {
    if (!id) return;
    const stored = sessionStorage.getItem(`game_${id}_player`) ?? null;
    setPlayerId(stored);

    socket.connect();
    socket.emit("joinRoom", { gameId: id, playerId: stored });

    socket.on("gameState", (state: GameState & { lastMoveFrom?: string; lastMoveTo?: string }) => {
      setGameState((prev) => {
        if (state.status === "active" && prev?.status === "selecting") {
          soundManager.playGameStart();
        } else if (state.status === "finished" && prev?.status !== "finished") {
          soundManager.playWin();
          const myColor = state.myColor;
          if (state.winner === "draw") {
            recordMatchResult("draw");
          } else if (state.winner === myColor) {
            recordMatchResult("win");
          } else if (state.winner) {
            recordMatchResult("loss");
          }
        } else if (
          (state as any).lastMoveFrom &&
          (state as any).lastMoveTo &&
          ((state as any).lastMoveFrom !== (prev as any)?.lastMoveFrom || (state as any).lastMoveTo !== (prev as any)?.lastMoveTo)
        ) {
          const eventText = (state.lastEvent || "").toLowerCase();
          if (eventText.includes("impostor")) {
            soundManager.playImpostor();
          } else if (eventText.includes("captured") || eventText.includes("take") || eventText.includes("x")) {
            soundManager.playCapture();
          } else if ((state as any).isCheck) {
            soundManager.playCheck();
          } else {
            soundManager.playMove();
          }
        }
        return state;
      });

      queryClient.invalidateQueries({ queryKey: GAME_QUERY_KEY });
      if (state.lastMoveFrom && state.lastMoveTo) {
        setLastMove({ from: state.lastMoveFrom, to: state.lastMoveTo });
      }
      setImpostorPhase("idle");
      setImpostorMoveType(null);
      setImpostorTargets([]);
      setInvestigateMode(false);
      setSelectedSquare(null);
      setPenaltySelectionType(null);
    });

    socket.on("moveError", (error: { message: string }) => {
      toast({ title: "Invalid Move", description: error.message, variant: "destructive" });
    });

    return () => {
      socket.off("gameState");
      socket.off("moveError");
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, toast, queryClient]);

  useEffect(() => {
    if (!initialData) return;
    setGameState((prev) => {
      if (!prev) return initialData;
      if (prev.status === "waiting" || prev.status === "selecting") {
        // Merge initialData but preserve player-specific socket values if they exist in prev
        return {
          ...initialData,
          myColor: prev.myColor ?? initialData.myColor,
          myImpostorSquare: prev.myImpostorSquare ?? initialData.myImpostorSquare,
        };
      }
      return prev; // active/finished: socket is source of truth
    });
  }, [initialData]);

  const handleSelectImpostor = useCallback((square: string) => {
    if (!playerId || !id) return;
    setImpostor.mutate(
      { id, data: { playerId, pawnSquare: square } },
      {
        onSuccess: (data) => {
          if (data.bothReady) {
            toast({ title: "Both players ready", description: "Match commencing..." });
          } else {
            toast({ title: "Impostor selected", description: "Awaiting opponent..." });
          }
        },
        onError: (err: any) => {
          toast({ title: "Invalid selection", description: err?.error ?? "Try again", variant: "destructive" });
        },
      }
    );
  }, [playerId, id, setImpostor, toast]);

  const checkIsPromotion = useCallback((from: string, to: string) => {
    if (!gameState) return false;
    try {
      const chess = new Chess(gameState.fen);
      const piece = chess.get(from as any);
      if (piece && piece.type === "p") {
        const isWhitePawn = piece.color === "w" && to.endsWith("8");
        const isBlackPawn = piece.color === "b" && to.endsWith("1");
        if (isWhitePawn || isBlackPawn) {
          const moves = chess.moves({ square: from as any, verbose: true });
          return moves.some((m) => m.to === to);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }, [gameState]);

  const handleConfirmPromotion = useCallback((piece: "q" | "r" | "b" | "n") => {
    if (!pendingPromotion || !id || !playerId) return;
    socket.emit("makeMove", {
      gameId: id,
      playerId,
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: piece,
    });
    setPendingPromotion(null);
  }, [pendingPromotion, id, playerId]);

  const handleBoardClick = useCallback((square: string) => {
    if (!gameState || !playerId) return;

    // Penalty selection click handling
    if (penaltySelectionType && gameState.penaltyTargetColor) {
      const penalizedColor = gameState.penaltyTargetColor;
      const targetChessColor = penalizedColor === "white" ? "w" : "b";
      const targetType = penaltySelectionType === "knight" ? "n" : "b";

      const chess = new Chess(gameState.fen);
      const piece = chess.get(square as any);
      if (piece && piece.color === targetChessColor && piece.type === targetType) {
        socket.emit("selectPenalty", { gameId: id, playerId, square });
        setPenaltySelectionType(null);
      }
      return;
    }

    if (gameState.penaltyTargetColor) return;

    // Impostor destination selection
    if (impostorPhase === "pickDestination" && impostorMoveType && gameState.myImpostorSquare) {
      if (impostorTargets.includes(square)) {
        socket.emit("activateImpostor", {
          gameId: id,
          playerId,
          fromSquare: gameState.myImpostorSquare,
          toSquare: square,
          moveType: impostorMoveType,
        });
        setImpostorPhase("idle");
        setImpostorMoveType(null);
        setImpostorTargets([]);
      }
      return;
    }

    // Investigation mode
    if (investigateMode) {
      const chess = new Chess(gameState.fen);
      const piece = chess.get(square as any);
      const playerChessColor = gameState.myColor === "white" ? "w" : "b";
      if (piece && piece.type === "p" && piece.color === playerChessColor) {
        setInvestigateTarget(square);
        setInvestigateDialogOpen(true);
        setInvestigateMode(false);
      }
      return;
    }

    // Impostor selection phase
    if (gameState.status === "selecting" && !gameState.myImpostorSquare) {
      const enemyRank = gameState.myColor === "white" ? "7" : "2";
      const validFiles = ["a","b","c","f","g","h"];
      if (square[1] === enemyRank && validFiles.includes(square[0])) {
        handleSelectImpostor(square);
      }
      return;
    }

    // Click-to-move during active game
    if (gameState.status === "active" && gameState.turn === gameState.myColor) {
      if (selectedSquare) {
        if (selectedSquare !== square) {
          if (checkIsPromotion(selectedSquare, square)) {
            setPendingPromotion({ from: selectedSquare, to: square });
            setSelectedSquare(null);
            return;
          }
          socket.emit("makeMove", {
            gameId: id,
            playerId,
            from: selectedSquare,
            to: square,
          });
        }
        setSelectedSquare(null);
      } else {
        setSelectedSquare(square);
      }
    }
  }, [gameState, playerId, impostorPhase, impostorMoveType, impostorTargets, investigateMode, selectedSquare, id, handleSelectImpostor, penaltySelectionType, checkIsPromotion]);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    setDragSquare(null);
    if (!sourceSquare || !targetSquare) return false;
    if (!gameState || gameState.status !== "active" || gameState.turn !== gameState.myColor || gameState.penaltyTargetColor) return false;
    if (checkIsPromotion(sourceSquare, targetSquare)) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return false;
    }
    socket.emit("makeMove", { gameId: id, playerId, from: sourceSquare, to: targetSquare });
    return true;
  }, [gameState, id, playerId, checkIsPromotion]);

  const onPieceDrag = useCallback(({ square }: { piece: any; square: any; isSparePiece: boolean }) => {
    if (!gameState || gameState.status !== "active" || gameState.turn !== gameState.myColor) return;
    setDragSquare(square);
    setSelectedSquare(null);
  }, [gameState]);

  // onSquareMouseDown fires instantly (before drag threshold) — use this to show
  // move hints immediately when the user starts pressing on one of their pieces.
  const onSquareMouseDown = useCallback(({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
    if (!gameState || gameState.status !== "active" || gameState.turn !== gameState.myColor) return;
    if (impostorPhase !== "idle" || investigateMode || gameState.penaltyTargetColor) return;
    if (!piece) return;
    // pieceType is e.g. "wP", "bN" — first char is the color
    const playerColorChar = gameState.myColor === "white" ? "w" : "b";
    if (piece.pieceType[0] !== playerColorChar) return;
    setDragSquare(square);
  }, [gameState, impostorPhase, investigateMode]);

  const onSquareMouseUp = useCallback(() => {
    setDragSquare(null);
  }, []);

  const startImpostor = () => setImpostorPhase("pickMoveType");
  const cancelImpostor = () => {
    setImpostorPhase("idle");
    setImpostorMoveType(null);
    setImpostorTargets([]);
  };
  const pickMoveType = (mt: "knight" | "bishop") => {
    if (!gameState?.myImpostorSquare || (gameState.myColor !== "white" && gameState.myColor !== "black")) return;
    const color = gameState.myColor;
    setImpostorMoveType(mt);
    setImpostorTargets(getImpostorTargets(gameState.myImpostorSquare, mt, color, gameState.fen, gameState.securedSquares));
    setImpostorPhase("pickDestination");
  };
  const startInvestigate = () => setInvestigateMode(true);
  const confirmInvestigate = () => {
    if (!investigateTarget || !playerId) return;
    socket.emit("investigate", { gameId: id, playerId, suspectSquare: investigateTarget });
    setInvestigateDialogOpen(false);
    setInvestigateTarget(null);
  };

  const resign = () => {
    if (playerId) socket.emit("resign", { gameId: id, playerId });
  };

  if (isLoading || !gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPlayer = !!gameState.myColor;

  const isPenaltyPending = !!gameState.penaltyTargetColor;
  const isChoosingPenalty = isPenaltyPending && gameState.myColor === (gameState.penaltyTargetColor === "white" ? "black" : "white") && !penaltySelectionType;
  const isPenalizedPlayer = isPenaltyPending && gameState.myColor === gameState.penaltyTargetColor;

  const penalizedColor = gameState.penaltyTargetColor;
  let opponentHasKnight = false;
  let opponentHasBishop = false;

  if (penalizedColor) {
    const chess = new Chess(gameState.fen);
    const targetChessColor = penalizedColor === "white" ? "w" : "b";

    // Count pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = FILES[c] + RANKS[r];
        const piece = chess.get(square as any);
        if (piece && piece.color === targetChessColor) {
          if (piece.type === "n") opponentHasKnight = true;
          if (piece.type === "b") opponentHasBishop = true;
        }
      }
    }
  }

  const isMyTurn = gameState.turn === gameState.myColor;
  const hasImpostorLeftStartingRank =
    gameState.myImpostorSquare &&
    (gameState.myColor === "white"
      ? !gameState.myImpostorSquare.endsWith("7")
      : !gameState.myImpostorSquare.endsWith("2"));

  const impostorAvailable =
    isMyTurn &&
    gameState.status === "active" &&
    !isPenaltyPending &&
    !!(gameState.myColor === "white" ? !gameState.whiteImpostorUsed : !gameState.blackImpostorUsed) &&
    !!gameState.myImpostorSquare &&
    !!hasImpostorLeftStartingRank;
  const opponentImpostorUsed =
    gameState.myColor === "white" ? gameState.blackImpostorUsed : gameState.whiteImpostorUsed;

  const investigateAvailable =
    isMyTurn &&
    gameState.status === "active" &&
    !isPenaltyPending &&
    !opponentImpostorUsed &&
    !!(gameState.myColor === "white" ? !gameState.whiteInvestigationUsed : !gameState.blackInvestigationUsed);

  // Check detection (client-side, no extra round-trip)
  const chessInstance = gameState ? new Chess(gameState.fen) : null;
  const kingInCheck = chessInstance?.isCheck() ?? false;

  // Build custom square styles
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  // Impostor selection highlights
  if (gameState.status === "selecting" && isPlayer && !gameState.myImpostorSquare) {
    const enemyRank = gameState.myColor === "white" ? "7" : "2";
    ["a","b","c","f","g","h"].forEach((file) => {
      customSquareStyles[`${file}${enemyRank}`] = {
        backgroundColor: "rgba(220, 38, 38, 0.25)",
        cursor: "pointer",
        boxShadow: "inset 0 0 8px 1px rgba(220,38,38,0.5)",
      };
    });
  }

  // My impostor pawn highlight
  if (gameState.myImpostorSquare && impostorPhase === "idle") {
    customSquareStyles[gameState.myImpostorSquare] = {
      boxShadow: "inset 0 0 12px 3px rgba(220, 38, 38, 0.9)",
    };
  }

  // Impostor source highlight during activation
  if (impostorPhase !== "idle" && gameState.myImpostorSquare) {
    customSquareStyles[gameState.myImpostorSquare] = {
      backgroundColor: "rgba(220, 38, 38, 0.4)",
      boxShadow: "inset 0 0 16px 4px rgba(220,38,38,1)",
    };
  }

  // Impostor target destinations
  if (impostorPhase === "pickDestination") {
    impostorTargets.forEach((sq) => {
      customSquareStyles[sq] = {
        backgroundColor: "rgba(59, 130, 246, 0.35)",
        boxShadow: "inset 0 0 8px 2px rgba(59,130,246,0.7)",
        cursor: "pointer",
      };
    });
  }

  // Secured pawns
  gameState.securedSquares.forEach((sq) => {
    customSquareStyles[sq] = {
      boxShadow: "inset 0 0 12px 3px rgba(234, 179, 8, 0.9)",
    };
  });

  // Selected square highlight
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: "rgba(255,255,255,0.2)",
    };
  }

  // Move hint dots (chess.com style) — show for selected square or drag square
  const hintSource = selectedSquare ?? dragSquare;
  if (
    hintSource &&
    chessInstance &&
    gameState.status === "active" &&
    isMyTurn &&
    impostorPhase === "idle" &&
    !investigateMode &&
    !isPenaltyPending
  ) {
    const moves = chessInstance.moves({ square: hintSource as any, verbose: true });
    moves.forEach((m) => {
      // Filter out knight/bishop captures on secured pawns
      const isSecuredCapture =
        gameState.securedSquares.includes(m.to) &&
        (m.piece === "n" || m.piece === "b");
      if (isSecuredCapture) return;

      const targetPiece = chessInstance.get(m.to as any);
      if (targetPiece) {
        // Capture square — ring border
        customSquareStyles[m.to] = {
          ...customSquareStyles[m.to],
          borderRadius: "50%",
          boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.35)",
        };
      } else {
        // Empty square — small centered dot
        customSquareStyles[m.to] = {
          ...customSquareStyles[m.to],
          background: "radial-gradient(circle, rgba(0,0,0,0.28) 25%, transparent 26%)",
        };
      }
    });
  }

  // Last move highlight (subtle amber tint)
  if (lastMove && impostorPhase === "idle" && !investigateMode) {
    customSquareStyles[lastMove.from] = {
      ...customSquareStyles[lastMove.from],
      backgroundColor: "rgba(234, 179, 8, 0.15)",
    };
    customSquareStyles[lastMove.to] = {
      ...customSquareStyles[lastMove.to],
      backgroundColor: "rgba(234, 179, 8, 0.25)",
    };
  }

  // Investigate mode — highlight own pawns currently on the board
  if (investigateMode && gameState.myColor && chessInstance) {
    const playerChessColor = gameState.myColor === "white" ? "w" : "b";
    FILES.forEach((file) => {
      RANKS.forEach((rank) => {
        const sq = `${file}${rank}`;
        const piece = chessInstance.get(sq as any);
        if (piece && piece.type === "p" && piece.color === playerChessColor) {
          customSquareStyles[sq] = {
            cursor: "pointer",
            backgroundColor: "rgba(168, 85, 247, 0.25)",
            boxShadow: "inset 0 0 8px 1px rgba(168,85,247,0.5)",
          };
        }
      });
    });
  }

  // Penalty piece selection highlights
  if (penaltySelectionType && penalizedColor) {
    const targetChessColor = penalizedColor === "white" ? "w" : "b";
    const targetType = penaltySelectionType === "knight" ? "n" : "b";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const square = FILES[c] + RANKS[r];
        const piece = chessInstance?.get(square as any);
        if (piece && piece.color === targetChessColor && piece.type === targetType) {
          customSquareStyles[square] = {
            backgroundColor: "rgba(220, 38, 38, 0.4)",
            cursor: "pointer",
            boxShadow: "inset 0 0 16px 4px rgba(220,38,38,1)",
          };
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row p-4 gap-6" data-testid="game-page">
      <style>{`
        ${gameState.whiteImpostorRevealed ? `
          [data-square="${gameState.whiteImpostorRevealed}"] img,
          [data-square="${gameState.whiteImpostorRevealed}"] svg,
          [data-square="${gameState.whiteImpostorRevealed}"] > div {
            filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.95)) drop-shadow(0 0 2px rgba(239, 68, 68, 0.95)) !important;
          }
        ` : ""}
        ${gameState.blackImpostorRevealed ? `
          [data-square="${gameState.blackImpostorRevealed}"] img,
          [data-square="${gameState.blackImpostorRevealed}"] svg,
          [data-square="${gameState.blackImpostorRevealed}"] > div {
            filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.95)) drop-shadow(0 0 2px rgba(239, 68, 68, 0.95)) !important;
          }
        ` : ""}
      `}</style>

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full aspect-square max-w-[620px] bg-card p-3 rounded-xl border border-border shadow-2xl relative">
          <Chessboard
            options={{
              position: gameState.fen,
              onPieceDrop: onDrop,
              onPieceDrag: onPieceDrag,
              onSquareClick: ({ square }) => handleBoardClick(square),
              onSquareMouseDown: (args, e) => onSquareMouseDown(args as any),
              onSquareMouseUp: () => onSquareMouseUp(),
              boardOrientation: gameState.myColor === "black" ? "black" : "white",
              squareStyles: customSquareStyles,
              darkSquareStyle: { backgroundColor: boardTheme.dark },
              lightSquareStyle: { backgroundColor: boardTheme.light },
              allowDragging: isMyTurn && gameState.status === "active" && impostorPhase === "idle" && !investigateMode && !isPenaltyPending
            }}
          />

          {/* Pawn Promotion Dropdown Menu (Chess.com Style) */}
          {pendingPromotion && (() => {
            const file = pendingPromotion.to[0];
            const rank = pendingPromotion.to[1];
            const fileIdx = FILES.indexOf(file);
            const fileIndex = gameState.myColor === "black" ? 7 - fileIdx : fileIdx;
            const leftOffset = `calc(12px + ${fileIndex} * (100% - 24px) / 8)`;
            const squareWidth = `calc((100% - 24px) / 8)`;
            const isTop = rank === "8";
            const pieceColor = isTop ? "w" : "b"; 
            const pieceSymbols = pieceColor === "w"
              ? { q: "♕", r: "♖", b: "♗", n: "♘" }
              : { q: "♛", r: "♜", b: "♝", n: "♞" };
            const options: Array<"q" | "r" | "b" | "n"> = ["q", "r", "b", "n"];

            return (
              <>
                {/* Backdrop to cancel promotion */}
                <div 
                  className="fixed inset-0 z-30 cursor-default" 
                  onClick={() => setPendingPromotion(null)} 
                />
                
                {/* Vertical dropdown menu over column */}
                <div 
                  className="absolute z-40 flex flex-col bg-card border border-border rounded shadow-2xl overflow-hidden"
                  style={{ 
                    left: leftOffset, 
                    width: squareWidth, 
                    top: isTop ? "12px" : "auto", 
                    bottom: isTop ? "auto" : "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                  }}
                >
                  {options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleConfirmPromotion(opt)}
                      className="w-full aspect-square flex items-center justify-center text-3xl font-medium transition-colors hover:bg-primary/20 active:bg-primary/30 bg-card border-b border-border/50 last:border-b-0"
                      style={{
                        color: pieceColor === "w" ? "#ffffff" : "#000000",
                        textShadow: pieceColor === "w" ? "0 0 2px #000000" : "0 0 2px #ffffff",
                      }}
                    >
                      {pieceSymbols[opt]}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}

          {/* Waiting overlay */}
          {gameState.status === "waiting" && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl text-center p-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <h2 className="text-2xl font-mono font-bold mb-2">Awaiting Player</h2>
              <p className="text-muted-foreground text-sm mb-3">Share this link with your opponent.</p>
              <p className="font-mono text-xl font-bold text-primary tracking-widest mb-4">{id}</p>
              <Button
                variant="outline"
                size="sm"
                className="font-mono gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}join/${id}`);
                  toast({ title: "Link copied!", description: "Send it to your opponent." });
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy invite link
              </Button>
            </div>
          )}

          {/* Impostor selection banner — does NOT block the board */}
          {gameState.status === "selecting" && isPlayer && (
            <div className="absolute bottom-0 left-0 right-0 z-10 rounded-b-xl border-t border-primary/50 bg-background/95 px-4 py-3 flex items-center gap-3">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              {gameState.myImpostorSquare ? (
                <p className="text-sm font-mono text-muted-foreground">Impostor placed — awaiting opponent...</p>
              ) : (
                <p className="text-sm font-mono text-primary">
                  Click a glowing red pawn (a, b, c, f, g, h file) to plant your sleeper agent.
                </p>
              )}
            </div>
          )}

          {/* Impostor move type selection overlay */}
          {impostorPhase === "pickMoveType" && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-xl text-center p-6 border border-primary/60">
              <Zap className="h-10 w-10 text-primary mb-3" />
              <h2 className="text-xl font-mono font-bold mb-1">Activate Impostor</h2>
              <p className="text-muted-foreground text-sm mb-5">Choose the move type for this one-time activation.</p>
              <div className="flex gap-3">
                <Button onClick={() => pickMoveType("knight")} className="font-mono" data-testid="btn-knight-move">
                  Knight Jump (L-shape)
                </Button>
                <Button onClick={() => pickMoveType("bishop")} variant="outline" className="font-mono" data-testid="btn-bishop-move">
                  Bishop Step (1 diagonal)
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground" onClick={cancelImpostor}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </div>
          )}

          {/* Impostor destination selection hint */}
          {impostorPhase === "pickDestination" && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/90 border-t border-primary/40 p-3 rounded-b-xl z-10 flex items-center justify-between">
              <span className="text-sm font-mono text-primary">Click a highlighted square to move</span>
              <Button variant="ghost" size="sm" onClick={cancelImpostor}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Penalty selection hint and label */}
          {penaltySelectionType && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/90 border-t border-red-500/40 p-3 rounded-b-xl z-20 flex items-center justify-between">
              <span className="text-sm font-mono text-red-500 font-bold">
                {penaltySelectionType === "bishop" ? "select the bishop" : "select the knight"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPenaltySelectionType(null)}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          )}

          {/* Game over overlay */}
          {gameState.status === "finished" && (
            <div className="absolute inset-0 bg-background/92 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-xl border border-border text-center p-6">
              <h2 className="text-4xl font-mono font-bold mb-2 text-primary font-display uppercase tracking-widest">Match Complete</h2>
              <p className="text-xl mb-6">
                {gameState.winner === "draw"
                  ? "Stalemate — draw."
                  : `${gameState.winner === "white" ? gameState.whitePlayerName : gameState.blackPlayerName} wins.`}
              </p>
              <Button onClick={() => setLocation("/")} variant="outline" className="font-mono">
                Return to Lobby
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setLocation("/")}
            data-testid="btn-back-lobby"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Lobby
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSound}
              className="h-9 w-9 border-border text-muted-foreground hover:text-foreground"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4 text-green-500" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 border-border text-muted-foreground hover:text-foreground"
              title="Board Settings & Colors"
            >
              <Settings className="h-4 w-4 text-red-500" />
            </Button>

            <img 
              src="/chess_logo.png" 
              alt="Hidden Gambit Logo" 
              className="h-10 w-auto object-contain cursor-pointer drop-shadow-[0_2px_10px_rgba(220,38,38,0.4)] hover:scale-105 transition-transform"
              onClick={() => setLocation("/")}
            />
          </div>
        </div>

        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

        {/* Players */}
        <Card className="bg-card border-card-border rounded-xl" data-testid="card-intel">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono flex items-center justify-between text-base">
              <span>Intel Report</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  gameState.status === "active"
                    ? "bg-green-500 animate-pulse"
                    : gameState.status === "finished"
                    ? "bg-red-500"
                    : "bg-yellow-500 animate-pulse"
                }`}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border text-sm">
              <div>
                <p className="font-bold">{gameState.whitePlayerName}</p>
                <p className="text-xs text-muted-foreground uppercase">White</p>
              </div>
              <Swords className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <p className="font-bold">{gameState.blackPlayerName ?? "Waiting..."}</p>
                <p className="text-xs text-muted-foreground uppercase">Black</p>
              </div>
            </div>

            {gameState.status === "active" && (
              <div
                className={`p-2 rounded-lg text-sm font-mono text-center border flex items-center justify-center gap-2 ${
                  kingInCheck
                    ? "border-red-500/80 bg-red-500/10 text-red-400"
                    : isMyTurn
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
                data-testid="turn-indicator"
              >
                {kingInCheck && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                {kingInCheck
                  ? `${gameState.turn === "white" ? gameState.whitePlayerName : gameState.blackPlayerName} in check!`
                  : isMyTurn
                  ? "Your turn"
                  : `${gameState.turn === "white" ? gameState.whitePlayerName : gameState.blackPlayerName}'s turn`}
              </div>
            )}

            {gameState.lastEvent && (
              <div className="p-3 bg-secondary/40 rounded-lg text-xs border-l-2 border-primary font-mono" data-testid="last-event">
                {gameState.lastEvent}
              </div>
            )}

            <div className="text-xs text-muted-foreground font-mono">
              Move {gameState.moveCount}
            </div>
          </CardContent>
        </Card>

        {/* Status indicators */}
        <Card className="bg-card border-card-border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-xs uppercase text-muted-foreground">Asset Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your impostor</span>
              <span className="font-mono text-xs">
                {gameState.myColor === "white"
                  ? gameState.whiteImpostorUsed
                    ? <span className="text-muted-foreground">Burned</span>
                    : !gameState.myImpostorSquare
                      ? gameState.whiteImpostorRevealed
                        ? <span className="text-red-400 font-bold">Neutralized</span>
                        : (gameState.status === "selecting" || gameState.status === "waiting")
                          ? <span className="text-yellow-500 font-bold">Not Selected</span>
                          : <span className="text-red-400 font-bold">Captured</span>
                      : <span className="text-green-500 font-bold">Active</span>
                  : gameState.blackImpostorUsed
                    ? <span className="text-muted-foreground">Burned</span>
                    : !gameState.myImpostorSquare
                      ? gameState.blackImpostorRevealed
                        ? <span className="text-red-400 font-bold">Neutralized</span>
                        : (gameState.status === "selecting" || gameState.status === "waiting")
                          ? <span className="text-yellow-500 font-bold">Not Selected</span>
                          : <span className="text-red-400 font-bold">Captured</span>
                      : <span className="text-green-500 font-bold">Active</span>}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Investigation</span>
              <span className="font-mono text-xs">
                {gameState.myColor === "white"
                  ? gameState.whiteInvestigationUsed
                    ? <span className="text-muted-foreground">Used</span>
                    : opponentImpostorUsed
                      ? <span className="text-muted-foreground">Unavailable</span>
                      : <span className="text-green-500 font-bold">Available</span>
                  : gameState.blackInvestigationUsed
                    ? <span className="text-muted-foreground">Used</span>
                    : opponentImpostorUsed
                      ? <span className="text-muted-foreground">Unavailable</span>
                      : <span className="text-green-500 font-bold">Available</span>}
              </span>
            </div>
            {gameState.securedSquares.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Secured pawns</span>
                <span className="font-mono text-xs text-yellow-400">{gameState.securedSquares.join(", ")}</span>
              </div>
            )}
            {(gameState.whiteImpostorRevealed || gameState.blackImpostorRevealed) && (
              <div className="pt-1 border-t border-border space-y-1">
                {gameState.whiteImpostorRevealed && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">White impostor</span>
                    <span className="font-mono text-red-400">{gameState.whiteImpostorRevealed}</span>
                  </div>
                )}
                {gameState.blackImpostorRevealed && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Black impostor</span>
                    <span className="font-mono text-red-400">{gameState.blackImpostorRevealed}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player actions */}
        {isPlayer && gameState.status === "active" && (
          <Card className="bg-card border-card-border rounded-xl border-dashed" data-testid="card-actions">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-xs uppercase text-muted-foreground">Player Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full font-mono text-sm"
                variant="outline"
                disabled={!impostorAvailable || impostorPhase !== "idle"}
                onClick={startImpostor}
                data-testid="btn-activate-impostor"
              >
                <Zap className="mr-2 h-4 w-4" />
                {impostorPhase !== "idle" ? "Activating..." : "Activate Impostor"}
              </Button>

              <Button
                className="w-full font-mono text-sm"
                variant="outline"
                disabled={!investigateAvailable || investigateMode}
                onClick={startInvestigate}
                data-testid="btn-investigate"
              >
                <Search className="mr-2 h-4 w-4" />
                {investigateMode ? "Click a pawn..." : "Investigate Pawn"}
              </Button>

              {investigateMode && (
                <p className="text-xs text-muted-foreground text-center font-mono">
                  Click one of your own highlighted pawns you think the opponent secretly controls. Wrong guess allows opponent to remove a knight or bishop.
                </p>
              )}

              <Button
                className="w-full font-mono text-sm"
                variant="ghost"
                size="sm"
                onClick={resign}
                data-testid="btn-resign"
              >
                Resign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Investigation confirmation dialog */}
      <Dialog open={investigateDialogOpen} onOpenChange={setInvestigateDialogOpen}>
        <DialogContent className="bg-card border-border font-mono">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Investigate {investigateTarget}?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              <strong>If wrong:</strong> your opponent chooses whether to remove one of your knights or bishops. The real impostor stays hidden.
              <br /><br />
              <strong>If correct:</strong> the impostor is neutralized and the pawn becomes secured — immune to knight and bishop captures.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => { setInvestigateDialogOpen(false); setInvestigateTarget(null); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmInvestigate}
              data-testid="btn-confirm-investigate"
            >
              <ChevronRight className="mr-1 h-4 w-4" /> Confirm Investigation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Choose Opponent Penalty Dialog */}
      <Dialog open={isChoosingPenalty} onOpenChange={() => {}}>
        <DialogContent className="bg-card border-border font-mono">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Choose Opponent's Penalty
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Your opponent wrongly investigated. Choose which piece of theirs you want to remove from the board:
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="destructive"
              disabled={!opponentHasKnight}
              onClick={() => setPenaltySelectionType("knight")}
              className="font-mono text-sm w-full sm:w-auto"
            >
              Remove Knight {!opponentHasKnight && "(Unavailable)"}
            </Button>
            <Button
              variant="destructive"
              disabled={!opponentHasBishop}
              onClick={() => setPenaltySelectionType("bishop")}
              className="font-mono text-sm w-full sm:w-auto"
            >
              Remove Bishop {!opponentHasBishop && "(Unavailable)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiting for Penalty Choice Dialog */}
      <Dialog open={isPenalizedPlayer} onOpenChange={() => {}}>
        <DialogContent className="bg-card border-border font-mono">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Penalty Choice Pending
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              You wrongly accused/investigated. Awaiting opponent's choice on whether to remove your Knight or your Bishop...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
