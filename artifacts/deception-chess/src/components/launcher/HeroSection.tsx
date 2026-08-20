import React from "react";
import { Swords } from "lucide-react";

interface HeroSectionProps {
  onPlayClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onPlayClick }) => {
  return (
    <div
      className="absolute z-20 select-none flex flex-col items-center w-full px-4"
      style={{
        bottom: "6%",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {/* HIDDEN GAMBIT Title Logo Image */}
      <img
        src="/text.png"
        alt="HIDDEN GAMBIT"
        className="w-[280px] sm:w-[360px] md:w-[420px] h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]"
      />

      {/* Sub-tagline */}
      <p className="mt-1.5 font-tech text-[10px] sm:text-xs tracking-[0.25em] font-semibold text-neutral-400 uppercase drop-shadow-md text-center">
        EVERY MOVE{" "}
        <span className="text-red-600 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">HIDES</span>{" "}
        A{" "}
        <span className="text-red-600 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">SECRET.</span>
      </p>

      {/* Premium Tactical Create Game Button */}
      {onPlayClick && (
        <button
          onClick={onPlayClick}
          className="group relative mt-4 px-9 py-4 bg-gradient-to-r from-red-950 via-red-800 to-red-950 hover:from-red-900 hover:via-red-600 hover:to-red-900 border-2 border-red-500/80 rounded clip-chamfer-btn shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:shadow-[0_0_50px_rgba(239,68,68,0.9)] flex items-center space-x-3.5 transform hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer pointer-events-auto overflow-hidden"
        >
          {/* Ambient Shimmer / Sheen Layer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          
          {/* Tactical Corner Accents */}
          <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/80" />
          <span className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/80" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/80" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/80" />

          <div className="w-8 h-8 rounded-full bg-red-600/40 border border-red-400/60 flex items-center justify-center shrink-0 group-hover:bg-red-500/60 transition-colors">
            <Swords className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          </div>
          <span className="font-tech font-extrabold text-sm sm:text-base tracking-[0.25em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            CREATE GAME
          </span>
        </button>
      )}
    </div>
  );
};
