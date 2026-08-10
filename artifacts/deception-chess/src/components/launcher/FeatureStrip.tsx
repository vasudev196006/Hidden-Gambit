import React from "react";

export const FeatureStrip: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto z-20 px-4 mb-4 select-none">
      <div className="bg-[#08080c]/90 backdrop-blur-md border border-neutral-800/60 rounded-md p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-neutral-800/60 shadow-2xl">
        {/* Item 1: CLASSIC GAMEPLAY */}
        <div className="flex items-center space-x-3.5 md:pr-4">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
              {/* Knight Icon Silhouette */}
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
              <path d="M12 3v4" />
              <path d="M8 11h8" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h3 className="font-tech font-bold text-xs tracking-wider uppercase text-red-500">
              CLASSIC GAMEPLAY
            </h3>
            <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
              The original Hidden Gambit experience. Outsmart your opponent and win.
            </p>
          </div>
        </div>

        {/* Item 2: STRATEGIZE */}
        <div className="flex items-center space-x-3.5 md:px-4 pt-3 md:pt-0">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
              {/* King / Bishop Crown Icon Silhouette */}
              <path d="M5 18h14" />
              <path d="M18 18V8l-4 4-2-6-2 6-4-4v10" />
              <circle cx="12" cy="4" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h3 className="font-tech font-bold text-xs tracking-wider uppercase text-red-500">
              STRATEGIZE
            </h3>
            <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
              Use deception, prediction and strategy to outplay your enemy.
            </p>
          </div>
        </div>

        {/* Item 3: OUTSMART */}
        <div className="flex items-center space-x-3.5 md:pl-4 pt-3 md:pt-0">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
              {/* Tactical Shield Emblem Silhouette */}
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h3 className="font-tech font-bold text-xs tracking-wider uppercase text-red-500">
              OUTSMART
            </h3>
            <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">
              Hidden information. Mind games. One wrong move can cost everything.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
