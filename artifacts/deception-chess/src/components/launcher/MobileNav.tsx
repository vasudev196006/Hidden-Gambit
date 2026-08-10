import React from "react";
import { Swords, Users, Shield, ShoppingCart, Settings } from "lucide-react";
import { NavTab } from "./Sidebar";

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "LOBBY", label: "LOBBY", icon: Users },
    { id: "PLAY", label: "PLAY", icon: Swords },
    { id: "LOADOUT", label: "LOADOUT", icon: Shield },
    { id: "STORE", label: "STORE", icon: ShoppingCart },
    { id: "SETTINGS", label: "SETTINGS", icon: Settings },
  ];

  return (
    <nav className="w-full h-16 bg-[#08080c]/98 border-t border-neutral-800/80 fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 backdrop-blur-md select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center space-y-1 py-1 px-3 rounded transition-colors ${
              isActive ? "text-red-500" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : "text-neutral-500"}`} />
            <span className={`text-[10px] font-tech font-bold uppercase tracking-wider ${isActive ? "text-red-500" : "text-neutral-500"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
