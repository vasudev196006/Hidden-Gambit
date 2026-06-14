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
} from "lucide-react";
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
function getImpostorTargets(from: string, moveType: "knight" | "bishop"): string[] {
  const [f, r] = squareToCoords(from);
  const deltas = moveType === "knight" ? KNIGHT_DELTAS : BISHOP_DELTAS;
  return deltas
    .map(([df, dr]) => coordsToSquare(f + df, r + dr))
    .filter((s): s is string => s !== null);
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

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  // Last move highlight
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

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

  useEffect(() => {
    if (!id) return;
    const stored = sessionStorage.getItem(`game_${id}_player`) ?? null;
    setPlayerId(stored);

    socket.connect();
    socket.emit("joinRoom", { gameId: id, playerId: stored });

    socket.on("gameState", (state: GameState & { lastMoveFrom?: string; lastMoveTo?: string }) => {
      setGameState(state);
      queryClient.invalidateQueries({ queryKey: GAME_QUERY_KEY });
      if (state.lastMoveFrom && state.lastMoveTo) {
        setLastMove({ from: state.lastMoveFrom, to: state.lastMoveTo });
      }
      setImpostorPhase("idle");
      setImpostorMoveType(null);
      setImpostorTargets([]);
      setInvestigateMode(false);
      setSelectedSquare(null);
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
        // Never overwrite a known myColor with null from a stale REST response
        if (prev.myColor && !initialData.myColor) {
          return { ...initialData, myColor: prev.myColor, myImpostorSquare: prev.myImpostorSquare };
        }
        return initialData;
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
            toast({ title: "Both operatives ready", description: "Operation commencing..." });
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

  const handleBoardClick = useCallback((square: string) => {
    if (!gameState || !playerId) return;

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
      setInvestigateTarget(square);
      setInvestigateDialogOpen(true);
      setInvestigateMode(false);
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
          socket.emit("makeMove", {
            gameId: id,
            playerId,
            from: selectedSquare,
            to: square,
            promotion: "q",
          });
        }
        setSelectedSquare(null);
      } else {
        setSelectedSquare(square);
      }
    }
  }, [gameState, playerId, impostorPhase, impostorMoveType, impostorTargets, investigateMode, selectedSquare, id, handleSelectImpostor]);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    if (!gameState || gameState.status !== "active" || gameState.turn !== gameState.myColor) return false;
    socket.emit("makeMove", { gameId: id, playerId, from: sourceSquare, to: targetSquare, promotion: "q" });
    return true;
  }, [gameState, id, playerId]);

  const startImpostor = () => setImpostorPhase("pickMoveType");
  const cancelImpostor = () => {
    setImpostorPhase("idle");
    setImpostorMoveType(null);
    setImpostorTargets([]);
  };
  const pickMoveType = (mt: "knight" | "bishop") => {
    if (!gameState?.myImpostorSquare) return;
    setImpostorMoveType(mt);
    setImpostorTargets(getImpostorTargets(gameState.myImpostorSquare, mt));
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
  const isMyTurn = gameState.turn === gameState.myColor;
  const impostorAvailable =
    isMyTurn &&
    gameState.status === "active" &&
    !!(gameState.myColor === "white" ? !gameState.whiteImpostorUsed : !gameState.blackImpostorUsed) &&
    !!gameState.myImpostorSquare;
  const investigateAvailable =
    isMyTurn &&
    gameState.status === "active" &&
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

  // Investigate mode — highlight own pawn rank (the rank the opponent chose their impostor from)
  if (investigateMode && gameState.myColor) {
    // White investigates rank 2 (their own pawns that black may control)
    // Black investigates rank 7 (their own pawns that white may control)
    const ownRank = gameState.myColor === "white" ? "2" : "7";
    ["a","b","c","d","e","f","g","h"].forEach((file) => {
      customSquareStyles[`${file}${ownRank}`] = {
        cursor: "pointer",
        backgroundColor: "rgba(168, 85, 247, 0.25)",
        boxShadow: "inset 0 0 8px 1px rgba(168,85,247,0.5)",
      };
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row p-4 gap-6" data-testid="game-page">

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full aspect-square max-w-[620px] bg-card p-3 rounded-xl border border-border shadow-2xl relative">
          <Chessboard
            options={{
              position: gameState.fen,
              onPieceDrop: onDrop,
              onSquareClick: ({ square }) => handleBoardClick(square),
              boardOrientation: gameState.myColor === "black" ? "black" : "white",
              squareStyles: customSquareStyles,
              darkSquareStyle: { backgroundColor: "#3d2b1f" },
              lightSquareStyle: { backgroundColor: "#7d5c45" },
              allowDragging: isMyTurn && gameState.status === "active" && impostorPhase === "idle" && !investigateMode
            }}
          />

          {/* Waiting overlay */}
          {gameState.status === "waiting" && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl text-center p-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <h2 className="text-2xl font-mono font-bold mb-2">Awaiting Operative</h2>
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

          {/* Game over overlay */}
          {gameState.status === "finished" && (
            <div className="absolute inset-0 bg-background/92 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-xl border border-border text-center p-6">
              <h2 className="text-4xl font-mono font-bold mb-2 text-primary">Operation Complete</h2>
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
        <Button
          variant="ghost"
          className="self-start text-muted-foreground"
          onClick={() => setLocation("/")}
          data-testid="btn-back-lobby"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Lobby
        </Button>

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
                  ? gameState.whiteImpostorUsed ? <span className="text-muted-foreground">Burned</span> : <span className="text-green-500">Active</span>
                  : gameState.blackImpostorUsed ? <span className="text-muted-foreground">Burned</span> : <span className="text-green-500">Active</span>}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Investigation</span>
              <span className="font-mono text-xs">
                {gameState.myColor === "white"
                  ? gameState.whiteInvestigationUsed ? <span className="text-muted-foreground">Used</span> : <span className="text-green-500">Available</span>
                  : gameState.blackInvestigationUsed ? <span className="text-muted-foreground">Used</span> : <span className="text-green-500">Available</span>}
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

        {/* Operative actions */}
        {isPlayer && gameState.status === "active" && (
          <Card className="bg-card border-card-border rounded-xl border-dashed" data-testid="card-actions">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-xs uppercase text-muted-foreground">Operative Actions</CardTitle>
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
                  Click one of your own highlighted pawns you think the opponent secretly controls. Wrong guess costs a knight and a bishop.
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
              <strong>If wrong:</strong> you lose 1 knight and 1 bishop immediately. The real impostor stays hidden.
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
    </div>
  );
}
