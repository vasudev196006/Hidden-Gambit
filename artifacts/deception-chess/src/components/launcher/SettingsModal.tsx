import React, { useState } from "react";
import { X, Settings, CheckCircle2, Palette } from "lucide-react";
import { BOARD_THEMES, getStoredTheme, setStoredTheme, BoardTheme } from "@/lib/boardTheme";

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(() => getStoredTheme());

  const handleSelectTheme = (themeId: string) => {
    const updated = setStoredTheme(themeId);
    setCurrentTheme(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-[#0c0c10] border border-neutral-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#111116] border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-red-500" />
            <h2 className="font-tech font-bold text-base text-neutral-100 uppercase tracking-widest">
              SETTINGS & CUSTOMIZATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Board Color Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-red-500" />
              <h3 className="font-tech font-bold text-xs uppercase tracking-wider text-neutral-300">
                CHESSBOARD THEME
              </h3>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              Customize the board square colors for your match view.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {BOARD_THEMES.map((theme) => {
                const isSelected = currentTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`group relative p-3 rounded-lg border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer flex flex-col space-y-2.5 ${
                      isSelected
                        ? "bg-red-950/40 border-red-500/80 shadow-[0_2px_12px_rgba(220,38,38,0.2)]"
                        : "bg-[#121218] border-neutral-800/80 hover:border-neutral-700"
                    }`}
                  >
                    {/* Mini 2x2 Chessboard Preview Box */}
                    <div className="w-full aspect-[2/1] rounded overflow-hidden border border-white/10 grid grid-cols-4 grid-rows-2">
                      <div style={{ backgroundColor: theme.light }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.light }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.light }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.light }} />
                    </div>

                    <div className="flex items-center justify-between w-full">
                      <span className="font-tech font-bold text-xs text-neutral-200 uppercase tracking-wide">
                        {theme.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
