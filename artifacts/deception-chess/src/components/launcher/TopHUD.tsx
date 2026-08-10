import React, { useState } from "react";
import { Bell, ChevronDown, Gem, Coins, User, Volume2, ShieldAlert, LogOut } from "lucide-react";

interface TopHUDProps {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({ onOpenProfile }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notifications = [
    { id: 1, title: "Sleeper Agent Unlocked", time: "10m ago", read: false },
    { id: 2, title: "Season Operation Live", time: "2h ago", read: false },
    { id: 3, title: "Tactical Victory +150 Gems", time: "1d ago", read: true },
  ];

  return (
    <div className="absolute top-5 right-6 z-30 flex items-center space-x-3 select-none">
      {/* Red Gems Indicator */}
      <div className="flex items-center space-x-2 bg-[#0a0a0e]/90 border border-neutral-800/80 px-3 py-1.5 rounded-full shadow-md">
        <Gem className="w-4 h-4 text-red-500 fill-red-500/30 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
        <span className="font-tech font-bold text-xs tracking-wider text-neutral-100">
          1,250
        </span>
      </div>

      {/* Gold Coins Indicator */}
      <div className="flex items-center space-x-2 bg-[#0a0a0e]/90 border border-neutral-800/80 px-3 py-1.5 rounded-full shadow-md">
        <Coins className="w-4 h-4 text-amber-500 fill-amber-500/30 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        <span className="font-tech font-bold text-xs tracking-wider text-neutral-100">
          24,680
        </span>
      </div>

      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowUserDropdown(false);
          }}
          className="relative w-9 h-9 bg-[#0a0a0e]/90 border border-neutral-800/80 hover:border-red-600/60 rounded-full flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full shadow-[0_0_6px_#ef4444]" />
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-72 bg-[#0d0d12]/95 border border-red-900/50 rounded shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="font-tech font-bold text-xs uppercase tracking-wider text-red-500 flex items-center">
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Intelligence Feeds
              </span>
              <span className="text-[10px] font-mono text-neutral-500">3 New</span>
            </div>
            <div className="flex flex-col space-y-2 mt-2 max-h-60 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-2 rounded text-xs border ${
                    !n.read
                      ? "bg-red-950/30 border-red-900/40 text-neutral-200"
                      : "bg-neutral-900/40 border-white/5 text-neutral-400"
                  }`}
                >
                  <div className="font-tech font-semibold flex items-center justify-between">
                    <span>{n.title}</span>
                    <span className="text-[9px] font-mono text-neutral-500">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Player Avatar Circle & Dropdown Chevron */}
      <div className="relative">
        <button
          onClick={() => {
            setShowUserDropdown(!showUserDropdown);
            setShowNotifications(false);
          }}
          className="flex items-center space-x-1 bg-[#0a0a0e]/90 border border-neutral-800/80 hover:border-red-600/60 p-1 rounded-full text-neutral-300 hover:text-white transition-colors"
        >
          <div className="w-7 h-7 bg-red-950 border border-red-600/80 rounded-full flex items-center justify-center text-red-400 shadow-inner">
            <User className="w-4 h-4" />
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 pr-0.5" />
        </button>

        {/* User Quick Menu Dropdown */}
        {showUserDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-[#0d0d12]/95 border border-red-900/50 rounded shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
            <div className="p-2 border-b border-neutral-800">
              <div className="font-tech font-bold text-sm text-neutral-100">GAMBIT_KNIGHT</div>
              <div className="text-[10px] font-mono text-red-500">Status: Operative Active</div>
            </div>
            <div className="flex flex-col space-y-1 mt-1">
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  if (onOpenProfile) onOpenProfile();
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-red-950/40 text-xs font-tech text-neutral-300 hover:text-white flex items-center"
              >
                <User className="w-3.5 h-3.5 mr-2 text-red-500" /> View Dossier
              </button>
              <button
                onClick={() => setShowUserDropdown(false)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-red-950/40 text-xs font-tech text-neutral-300 hover:text-white flex items-center"
              >
                <Volume2 className="w-3.5 h-3.5 mr-2 text-red-500" /> Audio Settings
              </button>
              <button
                onClick={() => setShowUserDropdown(false)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-red-950/40 text-xs font-tech text-neutral-400 hover:text-red-400 flex items-center border-t border-white/5 pt-2"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" /> Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
