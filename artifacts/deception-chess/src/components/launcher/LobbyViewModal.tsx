import React, { useState } from "react";
import { useLocation } from "wouter";
import { useListGames, useCreateGame, useJoinGame } from "@workspace/api-client-react";
import { X, Plus, LogIn, Loader2, Users, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface LobbyViewModalProps {
  onClose: () => void;
}

export const LobbyViewModal: React.FC<LobbyViewModalProps> = ({ onClose }) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem("playerName") || "GAMBIT_KNIGHT"
  );

  const { data: games, isLoading: isLoadingGames, refetch } = useListGames();
  const createGame = useCreateGame();
  const joinGame = useJoinGame();

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      toast({ title: "Player name required", variant: "destructive" });
      return;
    }
    localStorage.setItem("playerName", playerName);
    createGame.mutate(
      { data: { playerName } },
      {
        onSuccess: (res) => {
          sessionStorage.setItem(`game_${res.gameId}_player`, res.playerId);
          sessionStorage.setItem(`game_${res.gameId}_color`, res.color);
          setLocation(`/game/${res.gameId}`);
        },
        onError: () => {
          toast({ title: "Failed to create match", variant: "destructive" });
        },
      }
    );
  };

  const handleJoinGame = (gameId: string) => {
    if (!playerName.trim()) {
      toast({ title: "Player name required", variant: "destructive" });
      return;
    }
    localStorage.setItem("playerName", playerName);
    joinGame.mutate(
      { id: gameId, data: { playerName } },
      {
        onSuccess: (res) => {
          sessionStorage.setItem(`game_${res.gameId}_player`, res.playerId);
          sessionStorage.setItem(`game_${res.gameId}_color`, res.color);
          setLocation(`/game/${res.gameId}`);
        },
        onError: () => {
          toast({ title: "Failed to join match", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-3xl bg-[#09090d] border border-red-900/60 rounded clip-chamfer-panel shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#0e0e14] border-b border-red-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="font-tech font-bold text-lg text-neutral-100 uppercase tracking-widest">
              ACTIVE MATCHES
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-red-950/40 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Create Match Section */}
          <div className="relative bg-gradient-to-r from-red-950/60 via-[#100d14] to-red-950/60 border border-red-700/60 p-4 sm:p-5 rounded clip-chamfer-sm flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(220,38,38,0.25)] overflow-hidden">
            {/* Tactical Corner Accents */}
            <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-500/80" />
            <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-500/80" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-500/80" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-500/80" />

            <div className="flex-1 w-full space-y-1 z-10">
              <label className="text-xs font-tech font-semibold text-red-400 uppercase tracking-wider flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-ping" />
                PLAYER NAME
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Player Name..."
                className="w-full bg-[#050508]/90 border border-red-800/50 px-3.5 py-2.5 rounded font-mono text-sm text-neutral-100 focus:outline-none focus:border-red-500 shadow-inner"
              />
            </div>

            <button
              onClick={handleCreateGame}
              disabled={createGame.isPending}
              className="w-full md:w-auto h-11 px-7 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-tech font-extrabold text-sm tracking-[0.15em] uppercase rounded clip-chamfer-btn border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] hover:shadow-[0_0_30px_rgba(239,68,68,0.9)] flex items-center justify-center space-x-2 shrink-0 transition-all duration-200 active:scale-95 z-10 cursor-pointer"
            >
              {createGame.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
              )}
              <span>CREATE NEW MATCH</span>
            </button>
          </div>

          {/* Matches List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-tech font-bold text-sm uppercase tracking-wider text-neutral-300 flex items-center">
                <Users className="w-4 h-4 mr-2 text-red-500" /> OPEN MATCHES
              </h3>
              <button
                onClick={() => refetch()}
                className="text-xs font-tech text-red-500 hover:text-red-400 underline"
              >
                Refresh Matches
              </button>
            </div>

            {isLoadingGames ? (
              <div className="flex items-center justify-center py-12 text-neutral-400 space-x-2">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                <span className="font-tech text-sm">Scanning for matches...</span>
              </div>
            ) : games?.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-red-950/60 rounded p-6 bg-[#07070a]/60">
                <p className="font-tech text-neutral-400 text-sm">
                  No active matches found. Be the first to create a new match above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
                {games?.map((game) => (
                  <div
                    key={game.id}
                    className="bg-[#0e0e14]/90 border border-red-950/40 hover:border-red-600/50 p-4 rounded flex items-center justify-between transition-colors"
                  >
                    <div className="flex flex-col space-y-1">
                      <div className="font-tech font-bold text-base text-neutral-100 flex items-center space-x-2">
                        <span className="text-red-400">{game.whitePlayerName}</span>
                        <span className="text-neutral-500 text-xs font-mono">VS</span>
                        <span className="text-neutral-300">
                          {game.blackPlayerName || "AWAITING CHALLENGER"}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        Status: <span className="text-red-500 font-semibold">{game.status.toUpperCase()}</span> • Created {formatDistanceToNow(new Date(game.createdAt))} ago
                      </div>
                    </div>

                    <div>
                      {game.status === "waiting" ? (
                        <button
                          onClick={() => handleJoinGame(game.id)}
                          disabled={joinGame.isPending}
                          className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-600 text-white font-tech font-bold text-xs tracking-wider uppercase rounded clip-chamfer-sm flex items-center space-x-1.5 transition-colors"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>JOIN MATCH</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setLocation(`/game/${game.id}`)}
                          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-tech text-xs tracking-wider uppercase rounded clip-chamfer-sm"
                        >
                          SPECTATE
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
