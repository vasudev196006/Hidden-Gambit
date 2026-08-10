import React, { useState } from "react";
import { X, Shield, Eye, Lock, Check } from "lucide-react";

interface LoadoutViewModalProps {
  onClose: () => void;
}

export const LoadoutViewModal: React.FC<LoadoutViewModalProps> = ({ onClose }) => {
  const [selectedPieceSkin, setSelectedPieceSkin] = useState("gothic_obsidian");

  const pieceSkins = [
    {
      id: "gothic_obsidian",
      name: "Obsidian Warlord",
      rarity: "LEGENDARY",
      desc: "Forged in cracked dark volcanic stone with glowing crimson core energy.",
      equipped: true,
    },
    {
      id: "bloodstone_crimson",
      name: "Bloodstone Phantom",
      rarity: "EPIC",
      desc: "Crystalline blood-red quartz pieces with faint ember trails.",
      equipped: false,
    },
    {
      id: "void_monarch",
      name: "Void Monarch",
      rarity: "RARE",
      desc: "Aggressive dark metallic steel pieces etched with ancient runes.",
      equipped: false,
    },
  ];

  const tacticsCards = [
    {
      id: "sleeper_agent",
      name: "SLEEPER AGENT",
      type: "DECEPTION TACTIC",
      desc: "Disguise a Knight as a Pawn for the first 3 turns.",
      active: true,
    },
    {
      id: "fog_of_war",
      name: "FOG OF WAR",
      type: "INTEL RECON",
      desc: "Conceal piece identity on ranks 4 and 5.",
      active: true,
    },
    {
      id: "mimic_bishop",
      name: "MIMIC BISHOP",
      type: "FALSE SIGNAL",
      desc: "Feign a Bishop move vector before executing Knight strike.",
      active: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl bg-[#09090d] border border-red-900/60 rounded clip-chamfer-panel shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0e14] border-b border-red-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-500" />
            <h2 className="font-tech font-bold text-lg text-neutral-100 uppercase tracking-widest">
              TACTICAL LOADOUT & ARSENAL
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-red-950/40 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Piece Skin Arsenal */}
          <div>
            <h3 className="font-tech font-bold text-sm uppercase tracking-wider text-neutral-300 mb-3 flex items-center">
              <Eye className="w-4 h-4 mr-2 text-red-500" /> CHESS PIECE SET COSMETICS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pieceSkins.map((skin) => (
                <div
                  key={skin.id}
                  onClick={() => setSelectedPieceSkin(skin.id)}
                  className={`bg-[#0e0e14]/90 p-4 rounded clip-chamfer-sm border cursor-pointer transition-all ${
                    selectedPieceSkin === skin.id
                      ? "border-red-600 bg-red-950/20 red-glow-subtle"
                      : "border-red-950/40 hover:border-red-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-tech font-bold text-red-500 tracking-wider">
                      {skin.rarity}
                    </span>
                    {selectedPieceSkin === skin.id && (
                      <span className="text-[10px] font-tech bg-red-600 text-white px-2 py-0.5 rounded uppercase font-bold flex items-center">
                        <Check className="w-3 h-3 mr-1" /> EQUIPPED
                      </span>
                    )}
                  </div>
                  <h4 className="font-tech font-bold text-base text-neutral-100">{skin.name}</h4>
                  <p className="text-xs text-neutral-400 mt-1">{skin.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Tactics Deck */}
          <div>
            <h3 className="font-tech font-bold text-sm uppercase tracking-wider text-neutral-300 mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-red-500" /> SECRET DECEPTION CARDS DECK
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tacticsCards.map((card) => (
                <div
                  key={card.id}
                  className={`bg-[#0e0e14]/90 p-4 rounded clip-chamfer-sm border ${
                    card.active ? "border-red-900/60 bg-red-950/10" : "border-white/5 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-tech text-neutral-400 uppercase tracking-widest">
                      {card.type}
                    </span>
                    {!card.active && <Lock className="w-3.5 h-3.5 text-neutral-500" />}
                  </div>
                  <h4 className="font-tech font-bold text-sm text-red-400 tracking-wider">{card.name}</h4>
                  <p className="text-xs text-neutral-300 mt-1">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
