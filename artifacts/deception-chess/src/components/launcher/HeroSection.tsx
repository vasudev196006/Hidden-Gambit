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

      {/* Premium Clean Tactical Create Game Button */}
      {onPlayClick && (
        <button
          onClick={onPlayClick}
          className="group relative mt-4 px-8 py-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-tech font-bold text-sm sm:text-base tracking-[0.2em] uppercase rounded-lg border border-red-400/30 shadow-[0_4px_20px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_28px_rgba(220,38,38,0.6)] flex items-center space-x-3 transition-all duration-200 active:scale-[0.98] cursor-pointer pointer-events-auto"
        >
          <Swords className="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform duration-200" />
          <span>CREATE GAME</span>
        </button>
      )}
    </div>
  );
};
