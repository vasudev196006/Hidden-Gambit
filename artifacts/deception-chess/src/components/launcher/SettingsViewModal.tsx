import React, { useState } from "react";
import { X, Settings, Volume2, Sparkles, Monitor } from "lucide-react";

interface SettingsViewModalProps {
  onClose: () => void;
}

export const SettingsViewModal: React.FC<SettingsViewModalProps> = ({ onClose }) => {
  const [masterVolume, setMasterVolume] = useState(80);
  const [sfxVolume, setSfxVolume] = useState(90);
  const [embersEnabled, setEmbersEnabled] = useState(true);
  const [motionBlur, setMotionBlur] = useState(true);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-[#09090d] border border-red-900/60 rounded clip-chamfer-panel shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0e0e14] border-b border-red-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-red-500" />
            <h2 className="font-tech font-bold text-lg text-neutral-100 uppercase tracking-widest">
              SYSTEM CONFIGURATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-red-950/40 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Audio Settings */}
          <div className="space-y-4">
            <h3 className="font-tech font-bold text-sm uppercase tracking-wider text-neutral-300 flex items-center">
              <Volume2 className="w-4 h-4 mr-2 text-red-500" /> AUDIO SPECTRUM
            </h3>

            <div className="space-y-3 bg-[#0e0e14]/80 p-4 rounded border border-red-950/40">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-tech text-neutral-300">
                  <span>MASTER AUDIO</span>
                  <span>{masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="w-full accent-red-600 h-1.5 bg-neutral-900 rounded"
                />
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs font-tech text-neutral-300">
                  <span>TACTICAL SFX & CHESS PIECE STRIKES</span>
                  <span>{sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(Number(e.target.value))}
                  className="w-full accent-red-600 h-1.5 bg-neutral-900 rounded"
                />
              </div>
            </div>
          </div>

          {/* Graphics & Atmosphere */}
          <div className="space-y-4">
            <h3 className="font-tech font-bold text-sm uppercase tracking-wider text-neutral-300 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-red-500" /> ATMOSPHERE & RENDERING
            </h3>

            <div className="space-y-3 bg-[#0e0e14]/80 p-4 rounded border border-red-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-tech font-bold text-sm text-neutral-200">
                    BACKGROUND EMBERS & PARTICLES
                  </div>
                  <div className="text-xs text-neutral-400">
                    Render real-time canvas ember physics in hero section
                  </div>
                </div>
                <button
                  onClick={() => setEmbersEnabled(!embersEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    embersEnabled ? "bg-red-600" : "bg-neutral-800"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                      embersEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <div className="font-tech font-bold text-sm text-neutral-200">
                    ATMOSPHERIC GLOW & EYE FLARES
                  </div>
                  <div className="text-xs text-neutral-400">
                    Enable cinematic pulsing red eye flares on Knight/Bishop
                  </div>
                </div>
                <button
                  onClick={() => setMotionBlur(!motionBlur)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    motionBlur ? "bg-red-600" : "bg-neutral-800"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                      motionBlur ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
