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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-[#0c0c10] border border-neutral-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#111116] border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="font-tech font-bold text-base text-neutral-100 uppercase tracking-widest">
              PLAY CHESS MATCH
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Create Match Section */}
          <div className="bg-[#121218] border border-neutral-800/80 p-4 sm:p-5 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-tech font-semibold text-neutral-400 uppercase tracking-wider block">
                PLAYER NAME
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Player Name..."
                className="w-full bg-[#08080a] border border-neutral-800 focus:border-red-500/80 px-3.5 py-2.5 rounded-md font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none transition-colors"
              />
            </div>

            <button
              onClick={handleCreateGame}
              disabled={createGame.isPending}
              className="w-full md:w-auto h-11 px-6 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-tech font-bold text-xs tracking-widest uppercase rounded-md shadow-md flex items-center justify-center space-x-2 shrink-0 transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {createGame.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
              <span>CREATE NEW MATCH</span>
            </button>
          </div>

          {/* Join Private Match via Code Section */}
          <div className="bg-[#121218] border border-neutral-800/80 p-4 sm:p-5 rounded-lg space-y-3">
            <h3 className="font-tech font-bold text-xs uppercase tracking-wider text-neutral-300 flex items-center">
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
                className="w-full bg-[#08080a] border border-neutral-800 focus:border-red-500/80 px-3.5 py-2.5 rounded-md font-mono text-sm tracking-widest text-red-400 placeholder:text-neutral-600 uppercase focus:outline-none transition-colors"
              />

              <button
                onClick={handleJoinGameByCode}
                disabled={joinGame.isPending}
                className="w-full sm:w-auto h-10 px-5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 border border-neutral-700 text-white font-tech font-bold text-xs tracking-wider uppercase rounded-md flex items-center justify-center space-x-2 shrink-0 transition-all duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-50"
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
