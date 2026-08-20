import React, { useState } from "react";
import { Menu, Bell, X } from "lucide-react";
import { NavTab } from "./Sidebar";

interface MobileHeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenProfile?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenProfile,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs: NavTab[] = ["PLAY"];

  return (
    <>
      <header className="w-full h-14 bg-[#08080a]/95 border-b border-neutral-800/60 px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md select-none">
        {/* Left: Hamburger Menu */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 text-neutral-300 hover:text-white rounded transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-neutral-300" />
        </button>

        {/* Right: Notifications */}
        <div className="flex items-center space-x-3">
          {/* Notification icon */}
          <button className="p-1.5 relative text-neutral-300 hover:text-white">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full shadow-[0_0_4px_#ef4444]" />
          </button>
        </div>
      </header>

      {/* Drawer Overlay for Mobile Menu */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          <div className="p-4 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center space-x-2">
              <img src="/logo_transparent.png" alt="Logo" className="h-8 w-auto object-contain" />
              <span className="font-display font-bold text-base text-neutral-100 uppercase">
                HIDDEN <span className="text-red-600">GAMBIT</span>
              </span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between">
            {/* Nav list */}
            <div className="flex flex-col space-y-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    onSelectTab(tab);
                    setDrawerOpen(false);
                  }}
                  className={`w-full py-3.5 px-4 rounded clip-chamfer-btn font-tech font-bold text-base tracking-wider uppercase transition-colors ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-red-950 via-red-900 to-red-950 border border-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                      : "bg-[#0e0e14] border border-white/5 text-neutral-400"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Profile Drawer Card */}
            <div
              onClick={() => {
                if (onOpenProfile) onOpenProfile();
                setDrawerOpen(false);
              }}
              className="bg-[#0c0c10] border border-neutral-800 p-3 rounded-md flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-red-950 border border-red-600/60 rounded flex items-center justify-center text-red-500 font-bold text-xs">
                  KG
                </div>
                <div>
                  <div className="font-tech font-bold text-sm text-neutral-100">GAMBIT_KNIGHT</div>
                  <div className="text-[10px] font-mono text-neutral-400">Level 24 • 7,850 XP</div>
                </div>
              </div>
              <span className="text-xs font-tech text-red-500 font-bold uppercase">View Profile</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
