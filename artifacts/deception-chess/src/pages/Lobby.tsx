import React, { useState } from "react";
import { Sidebar, NavTab } from "@/components/launcher/Sidebar";
import { TopHUD } from "@/components/launcher/TopHUD";
import { HeroSection } from "@/components/launcher/HeroSection";
import { ChessArtwork } from "@/components/launcher/ChessArtwork";
import { CanvasEmbers } from "@/components/launcher/CanvasEmbers";
import { MobileHeader } from "@/components/launcher/MobileHeader";

import { LobbyViewModal } from "@/components/launcher/LobbyViewModal";
import { ProfileDossierModal } from "@/components/launcher/ProfileDossierModal";
import { SettingsModal } from "@/components/launcher/SettingsModal";

export default function Lobby() {
  const [activeTab, setActiveTab] = useState<NavTab>("PLAY");
  const [activeModal, setActiveModal] = useState<"PLAY" | "PROFILE" | "SETTINGS" | null>(null);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === "SETTINGS") {
      setActiveModal("SETTINGS");
    } else {
      setActiveModal("PLAY");
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#050505] text-neutral-100 flex flex-col lg:flex-row overflow-hidden select-none">
      {/* Real-time Canvas Embers Particle Layer */}
      <CanvasEmbers />

      {/* DESKTOP SIDEBAR (>= 1024px) */}
      <div className="hidden lg:block h-full z-20 shrink-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenProfile={() => setActiveModal("PROFILE")}
          onOpenSettings={() => {
            setActiveTab("SETTINGS");
            setActiveModal("SETTINGS");
          }}
        />
      </div>

      {/* MOBILE HEADER (< 1024px) */}
      <div className="block lg:hidden z-30">
        <MobileHeader
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenProfile={() => setActiveModal("PROFILE")}
        />
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="relative flex-1 h-full flex flex-col justify-between overflow-y-auto lg:overflow-hidden z-10 pb-0">
        {/* Centered Desktop Background Artwork */}
        <ChessArtwork />

        {/* Top-Right HUD (Desktop) */}
        <div className="hidden lg:block z-30">
          <TopHUD onOpenProfile={() => setActiveModal("PROFILE")} />
        </div>

        {/* Hero Section: text.png + tagline + create game button */}
        <HeroSection onPlayClick={() => handleSelectTab("PLAY")} />
      </main>

      {/* ACTIVE MODALS & OVERLAYS */}
      {activeModal === "PLAY" && <LobbyViewModal onClose={handleCloseModal} />}
      {activeModal === "PROFILE" && <ProfileDossierModal onClose={handleCloseModal} />}
      {activeModal === "SETTINGS" && <SettingsModal onClose={handleCloseModal} />}
    </div>
  );
}
