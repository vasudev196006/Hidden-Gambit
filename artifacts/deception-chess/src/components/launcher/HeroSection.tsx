import React from "react";
import { Swords } from "lucide-react";

interface HeroSectionProps {
  onPlayClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onPlayClick }) => {
  return (
    <div
      className="absolute z-20 select-none flex flex-col items-center"
      style={{
        top: "22%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <img
        src="/text.png"
        alt="HIDDEN GAMBIT"
        className="w-[300px] sm:w-[360px] md:w-[420px] h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]"
      />

      {/* Sub-tagline */}
      <p className="mt-1.5 font-tech text-[10px] sm:text-xs tracking-[0.25em] font-semibold text-neutral-400 uppercase drop-shadow-md">
        EVERY MOVE{" "}
        <span className="text-red-600 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">HIDES</span>{" "}
        A{" "}
        <span className="text-red-600 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">SECRET.</span>
      </p>

      {/* Big Play / Create Game Button */}
      {onPlayClick && (
        <button
          onClick={onPlayClick}
          className="mt-4 px-8 py-3.5 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-tech font-extrabold text-sm sm:text-base tracking-[0.2em] uppercase rounded-md border border-red-500 shadow-[0_0_25px_rgba(220,38,38,0.7)] hover:shadow-[0_0_35px_rgba(239,68,68,0.9)] flex items-center space-x-3 transform hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer pointer-events-auto"
        >
          <Swords className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
          <span>CREATE GAME</span>
        </button>
      )}
    </div>
  );
};
