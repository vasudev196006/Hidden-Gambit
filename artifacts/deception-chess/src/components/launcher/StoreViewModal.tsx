import React from "react";
import { X, ShoppingCart, Gem, Coins } from "lucide-react";

interface StoreViewModalProps {
  onClose: () => void;
}

export const StoreViewModal: React.FC<StoreViewModalProps> = ({ onClose }) => {
  const storeItems = [
    {
      id: "board_cracked",
      name: "CRACKED OBSIDIAN BOARD",
      category: "CHESSBOARD THEME",
      priceGems: 450,
      imageIcon: "♟️",
      featured: true,
    },
    {
      id: "trail_ember",
      name: "VOLCANIC EMBER TRAIL",
      category: "PIECE ANIMATION",
      priceCoins: 12500,
      imageIcon: "🔥",
      featured: false,
    },
    {
      id: "emote_checkmate",
      name: "DEVILISH KNIGHT EMOTE",
      category: "TACTICAL EMOTE",
      priceGems: 200,
      imageIcon: "⚔️",
      featured: false,
    },
    {
      id: "sound_gothic",
      name: "DARK SANCTUARY SFX PACK",
      category: "AUDIO THEME",
      priceCoins: 8000,
      imageIcon: "🔔",
      featured: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl bg-[#09090d] border border-red-900/60 rounded clip-chamfer-panel shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0e14] border-b border-red-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-red-500" />
            <h2 className="font-tech font-bold text-lg text-neutral-100 uppercase tracking-widest">
              BLACK MARKET ARMORY STORE
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-xs font-tech text-neutral-200">
              <Gem className="w-4 h-4 text-red-500 fill-red-500/30" />
              <span>1,250</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-tech text-neutral-200">
              <Coins className="w-4 h-4 text-amber-500 fill-amber-500/30" />
              <span>24,680</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-red-950/40 rounded transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storeItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#0e0e14]/90 border border-red-950/40 hover:border-red-600/60 p-4 rounded clip-chamfer-sm flex items-center space-x-4 transition-colors"
              >
                <div className="w-16 h-16 bg-red-950/40 border border-red-900/40 rounded flex items-center justify-center text-3xl shrink-0">
                  {item.imageIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-tech text-red-500 font-bold uppercase tracking-wider">
                    {item.category}
                  </span>
                  <h4 className="font-tech font-bold text-base text-neutral-100 truncate">
                    {item.name}
                  </h4>
                  <div className="mt-2 flex items-center justify-between">
                    {item.priceGems ? (
                      <span className="flex items-center space-x-1 text-xs font-tech font-bold text-red-400">
                        <Gem className="w-3.5 h-3.5 fill-red-500/40" />
                        <span>{item.priceGems} Gems</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs font-tech font-bold text-amber-400">
                        <Coins className="w-3.5 h-3.5 fill-amber-500/40" />
                        <span>{item.priceCoins?.toLocaleString()} Gold</span>
                      </span>
                    )}

                    <button className="px-3 py-1 bg-metallic-red hover:bg-metallic-red-hover text-white font-tech font-bold text-xs uppercase rounded clip-chamfer-sm border border-red-500/60 transition-transform active:scale-95">
                      PURCHASE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
