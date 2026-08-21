import React from "react";
import { X, User, Trophy, Flame, Target, ShieldCheck } from "lucide-react";

interface ProfileDossierModalProps {
  onClose: () => void;
}

export const ProfileDossierModal: React.FC<ProfileDossierModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-[#0c0c10] border border-neutral-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#111116] border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <User className="w-5 h-5 text-red-500" />
            <h2 className="font-tech font-bold text-base text-neutral-100 uppercase tracking-widest">
              PLAYER PROFILE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Main Profile Info */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 bg-[#121218] p-4 rounded-lg border border-neutral-800/80">
            <div className="w-16 h-16 bg-neutral-900 border border-neutral-700/60 rounded-lg flex items-center justify-center text-red-500 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-10 h-10">
                <path d="M12 2C7 2 4 6 4 11v4c0 3 2.5 6 8 7 5.5-1 8-4 8-7v-4c0-5-3-9-8-9z" />
                <path d="M8 10h8" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 10v7" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                <h3 className="font-tech font-bold text-lg text-neutral-100">GAMBIT_KNIGHT</h3>
                <span className="text-[10px] font-tech font-bold bg-red-950/80 border border-red-800 text-red-400 px-2 py-0.5 rounded-full uppercase self-center sm:self-auto mt-1 sm:mt-0">
                  GRANDMASTER
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400">Clearance Level 24 • Specialization: Sleeper Tactics</p>

              {/* Progress Bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>EXP: 7,850 / 12,000</span>
                  <span>65.4%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-red-600 rounded-full w-[65.4%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">142</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">GAMES WON</div>
            </div>

            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <Flame className="w-4 h-4 text-red-500 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">12</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">WIN STREAK</div>
            </div>

            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <Target className="w-4 h-4 text-red-400 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">89.4%</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">ACCURACY</div>
            </div>

            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">198</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">MATCHES</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
