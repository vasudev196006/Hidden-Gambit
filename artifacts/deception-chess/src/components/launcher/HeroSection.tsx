import React from "react";

export const HeroSection: React.FC = () => {
  return (
    <div
      className="absolute z-20 select-none flex flex-col items-center"
      style={{
        top: "57%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <img
        src="/text.png"
        alt="HIDDEN GAMBIT"
        className="w-[320px] sm:w-[380px] md:w-[420px] h-auto object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]"
      />

      {/* Sub-tagline */}
      <p className="mt-1.5 font-tech text-[10px] sm:text-xs tracking-[0.25em] font-semibold text-neutral-400 uppercase drop-shadow-md">
        EVERY MOVE{" "}
        <span className="text-red-600 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">HIDES</span>{" "}
        A{" "}
        <span className="text-red-600 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">SECRET.</span>
      </p>
    </div>
  );
};
