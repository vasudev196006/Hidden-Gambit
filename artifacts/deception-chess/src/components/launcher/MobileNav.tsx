import React from "react";
import { Swords } from "lucide-react";
import { NavTab } from "./Sidebar";

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onSelectTab }) => {
  return (
    <nav className="w-full h-16 bg-[#08080c]/98 border-t border-neutral-800/80 fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center px-2 backdrop-blur-md select-none">
      <button
        onClick={() => onSelectTab("PLAY")}
        className="relative -translate-y-3 flex flex-col items-center justify-center group"
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-red-600 via-red-700 to-red-950 border-2 border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.8)] flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-transform duration-200">
          <Swords className="w-7 h-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>
        <span className="text-xs font-tech font-extrabold uppercase tracking-widest text-red-500 mt-1 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">
          PLAY
        </span>
      </button>
    </nav>
  );
};
