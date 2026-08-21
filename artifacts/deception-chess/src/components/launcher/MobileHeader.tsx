import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { FaDiscord, FaXTwitter, FaGithub } from "react-icons/fa6";
import { NavTab } from "./Sidebar";

interface MobileHeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenProfile?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs: NavTab[] = ["PLAY"];

  return (
    <>
      <header className="w-full h-14 bg-[#08080a]/95 border-b border-neutral-800/60 px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md select-none">
        {/* Left: Hamburger Menu & Social Icons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 text-neutral-300 hover:text-white rounded transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-neutral-300" />
          </button>

          {/* Social Icons right next to 3-bar menu button */}
          <div className="flex items-center space-x-1 pl-1 text-neutral-400">
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
                  className={`w-full py-3 px-4 rounded-lg font-tech font-bold text-sm tracking-wider uppercase transition-all duration-150 active:scale-[0.98] ${
                    activeTab === tab
                      ? "bg-red-950/60 border border-red-500/80 text-white shadow-[0_2px_12px_rgba(220,38,38,0.25)]"
                      : "bg-[#0c0c10] border border-neutral-800 text-neutral-400"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
