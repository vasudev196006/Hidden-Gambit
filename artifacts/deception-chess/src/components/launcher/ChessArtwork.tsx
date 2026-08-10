import React from "react";

export const ChessArtwork: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none flex items-center justify-center z-0">
      {/* Base Background Color */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Desktop Background Image (desktopbg.png) */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src="/desktopbg.png"
          alt="Desktop Background"
          className="w-full h-full object-cover object-center opacity-100 transition-opacity duration-700 filter contrast-[1.05] brightness-[1.02]"
        />

        {/* Ambient Dark Edge Vignettes to blend seamlessly */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#050505] via-[#050505]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050505] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050505] to-transparent" />
      </div>
    </div>
  );
};
