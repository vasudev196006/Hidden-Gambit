import React from "react";
import { Swords } from "lucide-react";
import { FaDiscord, FaXTwitter, FaGithub } from "react-icons/fa6";

export type NavTab = "PLAY";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenProfile,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "PLAY", label: "PLAY", icon: Swords },
  ];

  return (
    <aside className="w-[250px] shrink-0 h-full bg-[#08080a] border-r border-neutral-800/40 flex flex-col justify-between p-4 z-20 relative select-none">
      {/* Top Section: Logo & Navigation */}
      <div className="flex flex-col space-y-5">
        {/* Sidebar Logo Container */}
        <div className="flex flex-col items-center justify-center pt-2 pb-1">
          <img
            src="/logo_transparent.png"
            alt="Hidden Gambit"
            className="h-28 w-auto object-contain hover:scale-105 transition-transform duration-300 cursor-pointer"
            onClick={() => onSelectTab("LOBBY")}
          />
        </div>

        {/* Navigation Button List */}
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`group relative w-full h-11 px-4 flex items-center space-x-3.5 rounded transition-all duration-200 clip-chamfer-btn text-left ${
                  isActive
                    ? "bg-gradient-to-r from-red-950/90 via-red-900/50 to-red-950/80 border border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.35)] font-bold"
                    : "bg-[#0e0e12]/80 hover:bg-[#15151c]/90 border border-white/5 hover:border-red-900/30 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                    isActive
                      ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                      : "text-neutral-500 group-hover:text-neutral-300"
                  }`}
                />
                <span className="font-tech tracking-wider text-sm uppercase">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Profile Panel & Community Socials */}
      <div className="flex flex-col space-y-4 pt-3 border-t border-neutral-800/40">
        {/* PLAYER Label */}
        <div className="flex flex-col space-y-2">
          <span className="text-[11px] font-tech font-bold uppercase tracking-widest text-red-600">
            PLAYER
          </span>

          {/* Player Profile Card */}
          <div
            onClick={onOpenProfile}
            className="bg-[#0c0c10] border border-neutral-800/80 hover:border-red-900/50 rounded-md p-3 flex flex-col space-y-2.5 cursor-pointer transition-colors group"
          >
            <div className="flex items-center space-x-3">
              {/* Knight Helmet Avatar Box */}
              <div className="relative w-11 h-11 shrink-0 bg-gradient-to-b from-red-950/80 to-black border border-red-700/60 rounded clip-chamfer-sm flex items-center justify-center shadow-inner group-hover:border-red-500 transition-colors">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="w-6 h-6 text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                >
                  <path d="M12 2C7 2 4 6 4 11v4c0 3 2.5 6 8 7 5.5-1 8-4 8-7v-4c0-5-3-9-8-9z" />
                  <path d="M8 10h8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 10v7" strokeWidth="1.5" />
                  <circle cx="10" cy="8" r="1" fill="currentColor" />
                  <circle cx="14" cy="8" r="1" fill="currentColor" />
                </svg>
              </div>

              {/* Username & Level */}
              <div className="flex-1 min-w-0">
                <div className="font-tech font-bold text-sm text-neutral-100 truncate group-hover:text-red-400 transition-colors">
                  GAMBIT_KNIGHT
                </div>
                <div className="text-[11px] font-tech text-neutral-500">
                  Level 24
                </div>
              </div>
            </div>

            {/* Horizontal XP Progress Bar */}
            <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-red-800 to-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                style={{ width: "65.4%" }}
              />
            </div>

            {/* XP text */}
            <div className="text-[10px] font-mono text-center text-neutral-500 pt-0.5">
              <span className="text-red-500 font-bold">7,850</span> / 12,000 XP
            </div>
          </div>
        </div>

        {/* Community Social Links */}
        <div className="flex items-center space-x-4 pt-1 px-1 text-neutral-500">
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Discord"
            className="hover:text-red-500 transition-colors p-1"
          >
            <FaDiscord className="w-4 h-4" />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter X"
            className="hover:text-red-500 transition-colors p-1"
          >
            <FaXTwitter className="w-4 h-4" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hover:text-red-500 transition-colors p-1"
          >
            <FaGithub className="w-4 h-4" />
          </a>
        </div>
      </div>
    </aside>
  );
};
