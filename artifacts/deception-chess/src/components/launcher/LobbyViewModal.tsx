import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateGame, useJoinGame } from "@workspace/api-client-react";
import { X, Plus, LogIn, Loader2, Radio } from "lucide-react";
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
  const [joinCode, setJoinCode] = useState("");

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

  const handleJoinGameByCode = () => {
    if (!playerName.trim()) {
      toast({ title: "Player name required", variant: "destructive" });
      return;
    }
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      toast({ title: "Match code required", variant: "destructive" });
      return;
    }
    localStorage.setItem("playerName", playerName);
    joinGame.mutate(
      { id: cleanCode, data: { playerName } },
      {
        onSuccess: (res) => {
          sessionStorage.setItem(`game_${res.gameId}_player`, res.playerId);
          sessionStorage.setItem(`game_${res.gameId}_color`, res.color);
          setLocation(`/game/${res.gameId}`);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || "Failed to join match";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-[#09090d] border border-red-900/60 rounded clip-chamfer-panel shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#0e0e14] border-b border-red-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="font-tech font-bold text-lg text-neutral-100 uppercase tracking-widest">
              PLAY CHESS MATCH
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

          {/* Join Private Match via Code Section */}
          <div className="relative bg-[#0d0d12]/90 border border-red-950/50 p-4 sm:p-5 rounded clip-chamfer-sm space-y-3">
            <h3 className="font-tech font-bold text-sm uppercase tracking-wider text-neutral-300 flex items-center">
              <LogIn className="w-4 h-4 mr-2 text-red-500" /> JOIN PRIVATE MATCH VIA CODE
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinGameByCode()}
                placeholder="ENTER 6-CHAR CODE (e.g. H6B2XT)"
                maxLength={6}
                className="w-full bg-[#050508] border border-neutral-800 focus:border-red-500 px-4 py-2.5 rounded font-mono text-sm tracking-widest text-red-400 uppercase focus:outline-none"
              />

              <button
                onClick={handleJoinGameByCode}
                disabled={joinGame.isPending}
                className="w-full sm:w-auto h-10 px-6 bg-red-950/80 hover:bg-red-900 border border-red-600 text-white font-tech font-bold text-xs tracking-wider uppercase rounded clip-chamfer-sm flex items-center justify-center space-x-2 shrink-0 transition-colors cursor-pointer"
              >
                {joinGame.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>JOIN MATCH</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
