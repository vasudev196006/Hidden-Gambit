import React, { useState } from "react";
import { X, User, Trophy, Flame, Target, ShieldCheck, Edit2, Check, UserCheck } from "lucide-react";
import { getStoredProfile, updateProfileName, calculateRank, PlayerProfile } from "@/lib/playerProfile";

interface ProfileDossierModalProps {
  onClose: () => void;
}

export const ProfileDossierModal: React.FC<ProfileDossierModalProps> = ({ onClose }) => {
  const [profile, setProfile] = useState<PlayerProfile>(() => getStoredProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);

  const { rankTitle, level, expInLevel, expForNextLevel } = calculateRank(profile.exp);
  const expPercent = Math.min(100, Math.round((expInLevel / expForNextLevel) * 100));

  const winRate = profile.totalGames > 0 
    ? Math.round((profile.wins / profile.totalGames) * 100) 
    : 0;

  const handleSaveName = () => {
    if (!editName.trim()) return;
    const updated = updateProfileName(editName.trim(), false);
    setProfile(updated);
    setIsEditing(false);
  };

  const handlePlayAsGuest = () => {
    const guestNum = Math.floor(1000 + Math.random() * 9000);
    const guestName = `Guest_${guestNum}`;
    const updated = updateProfileName(guestName, true);
    setProfile(updated);
    setEditName(guestName);
    setIsEditing(false);
  };

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

            <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                {isEditing ? (
                  <div className="flex items-center space-x-2 w-full">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                      className="bg-[#08080a] border border-neutral-700 text-white font-mono text-sm px-2.5 py-1 rounded focus:outline-none focus:border-red-500 flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <h3 className="font-tech font-bold text-lg text-neutral-100">{profile.name}</h3>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title="Edit Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {profile.isGuest && (
                      <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                        GUEST
                      </span>
                    )}
                  </div>
                )}

                <span className="text-[10px] font-tech font-bold bg-red-950/80 border border-red-800 text-red-400 px-2.5 py-0.5 rounded-full uppercase self-center sm:self-auto">
                  {rankTitle}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>Clearance Level {level}</span>
                <button
                  onClick={handlePlayAsGuest}
                  className="text-[11px] text-red-400 hover:text-red-300 underline underline-offset-2 flex items-center space-x-1 cursor-pointer"
                >
                  <UserCheck className="w-3 h-3 mr-0.5" />
                  <span>Play as Guest</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="pt-1.5">
                <div className="flex justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span>EXP: {profile.exp.toLocaleString()}</span>
                  <span>{expPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-red-600 rounded-full transition-all duration-300" style={{ width: `${expPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Profile Metrics — Actual Game Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">{profile.wins}</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">GAMES WON</div>
            </div>

            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <Flame className="w-4 h-4 text-red-500 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">{profile.winStreak}</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">WIN STREAK</div>
            </div>

            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <Target className="w-4 h-4 text-red-400 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">{winRate}%</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">WIN RATE</div>
            </div>

            <div className="bg-[#121218] p-3.5 rounded-lg border border-neutral-800/80 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <div className="font-tech font-bold text-base text-neutral-100">{profile.totalGames}</div>
              <div className="text-[10px] font-tech text-neutral-400 uppercase tracking-wider">MATCHES</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
