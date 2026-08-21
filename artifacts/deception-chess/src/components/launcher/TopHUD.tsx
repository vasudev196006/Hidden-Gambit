import React, { useState, useEffect } from "react";
import { ChevronDown, User } from "lucide-react";
import { getStoredProfile, PlayerProfile } from "@/lib/playerProfile";

interface TopHUDProps {
  onOpenProfile?: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({ onOpenProfile }) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(() => getStoredProfile());

  useEffect(() => {
    const handleProfileChange = (e: Event) => {
      const customEv = e as CustomEvent<PlayerProfile>;
      if (customEv.detail) {
        setProfile(customEv.detail);
      } else {
        setProfile(getStoredProfile());
      }
    };
    window.addEventListener("playerProfileChanged", handleProfileChange);
    return () => window.removeEventListener("playerProfileChanged", handleProfileChange);
  }, []);

  return (
    <div className="absolute top-5 right-6 z-30 flex items-center space-x-3 select-none">
      {/* Player Avatar Circle & Dropdown Chevron */}
      <div className="relative">
        <button
          onClick={() => {
            setShowUserDropdown(!showUserDropdown);
          }}
          className="flex items-center space-x-1.5 bg-[#0a0a0e]/90 border border-neutral-800/80 hover:border-red-600/60 p-1 pl-1.5 rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 bg-red-950 border border-red-600/80 rounded-full flex items-center justify-center text-red-400 shadow-inner">
            <User className="w-4 h-4" />
          </div>
          <span className="font-tech font-bold text-xs text-neutral-200 px-1 max-w-[100px] truncate">
            {profile.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 pr-0.5" />
        </button>

        {/* User Quick Menu Dropdown */}
        {showUserDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-[#0d0d12]/95 border border-neutral-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
            <div className="p-2 border-b border-neutral-800">
              <div className="font-tech font-bold text-sm text-neutral-100 flex items-center justify-between">
                <span>{profile.name}</span>
                {profile.isGuest && (
                  <span className="text-[9px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 px-1 py-0.2 rounded">
                    GUEST
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-neutral-400">Total Matches: {profile.totalGames}</div>
            </div>
            <div className="flex flex-col space-y-1 mt-1">
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  if (onOpenProfile) onOpenProfile();
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-red-950/40 text-xs font-tech text-neutral-300 hover:text-white flex items-center cursor-pointer"
              >
                <User className="w-3.5 h-3.5 mr-2 text-red-500" /> View Profile & Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
