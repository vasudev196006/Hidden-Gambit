import React from "react";
import { Swords } from "lucide-react";
import { FaDiscord, FaXTwitter, FaGithub } from "react-icons/fa6";

export type NavTab = "PLAY" | "LOBBY";

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
                className={`group relative w-full h-11 px-4 flex items-center space-x-3 rounded-lg text-left transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                  isActive
                    ? "bg-red-950/50 border border-red-500/80 text-white shadow-[0_2px_12px_rgba(220,38,38,0.25)] font-semibold"
                    : "bg-[#0c0c10] hover:bg-[#121218] border border-neutral-800/80 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                    isActive ? "text-red-500" : "text-neutral-500 group-hover:text-neutral-300"
                  }`}
                />
                <span className="font-tech font-bold tracking-wider text-xs uppercase">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Community Socials */}
      <div className="flex flex-col space-y-4 pt-3 border-t border-neutral-800/40">
        {/* Community Social Links */}
        <div className="flex items-center justify-around px-1 text-neutral-400">
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Discord"
            className="hover:text-red-500 transition-colors p-1.5"
          >
            <FaDiscord className="w-5 h-5" />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Twitter X"
            className="hover:text-red-500 transition-colors p-1.5"
          >
            <FaXTwitter className="w-5 h-5" />
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hover:text-red-500 transition-colors p-1.5"
          >
            <FaGithub className="w-5 h-5" />
          </a>
        </div>
      </div>
    </aside>
  );
};
