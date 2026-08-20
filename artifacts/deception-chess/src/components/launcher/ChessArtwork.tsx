import React from "react";

export const ChessArtwork: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full min-h-[100dvh] pointer-events-none overflow-hidden select-none z-0">
      {/* Base Background Color */}
      <div className="absolute inset-0 bg-[#050505]" />

      {/* Desktop Background Image (desktopbg.png) */}
      <div className="relative w-full h-full hidden md:flex items-center justify-center">
        <img
          src="/desktopbg.png"
          alt="Desktop Background"
          className="w-full h-full object-cover object-center opacity-100 filter contrast-[1.05] brightness-[1.02]"
        />

        {/* Ambient Dark Edge Vignettes */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#050505] via-[#050505]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050505] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050505] to-transparent" />
      </div>

      {/* Mobile Background Image (mobile_ui.png) */}
      <div className="relative w-full h-full flex md:hidden items-center justify-center">
        <img
          src="/mobile_ui.png"
          alt="Mobile Background"
          className="w-full h-full object-cover object-center scale-100 min-w-full min-h-full opacity-100 filter contrast-[1.05] brightness-[1.02]"
        />

        {/* Mobile Edge Vignettes */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050505]/50 via-[#050505]/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#050505]/60 via-[#050505]/20 to-transparent" />
      </div>
    </div>
  );
};
