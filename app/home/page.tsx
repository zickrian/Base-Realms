"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  HeaderBar,
  DailyPacks,
  StageDisplay,
  BattleSection,
  BottomNav,
  CardsMenu,
  QuestMenu,
  CardRevealModal,
  SettingsMenu,
} from "../components/game";
import { LoadingState } from "../components/LoadingState";
import styles from "./page.module.css";

// Mock data untuk demo
const mockPlayerData = {
  level: 5,
  xpPercentage: 65,
};

const mockStageData = {
  name: "MYSTIC PEAKS",
  stageNumber: 3,
};

export default function HomePage() {
  const router = useRouter();
  const { isConnected, isConnecting } = useAccount();
  const [activeNav, setActiveNav] = useState<"cards" | "arena" | "market">(
    "arena"
  );
  const [isQuestMenuOpen, setIsQuestMenuOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Redirect to landing page if wallet is not connected
  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.push("/");
    }
  }, [isConnected, isConnecting, router]);

  // Show loading state while checking connection or connecting
  if (isConnecting) {
    return <LoadingState />;
  }

  // Don't render content if not connected (will redirect)
  if (!isConnected) {
    return <LoadingState />;
  }

  const handleBattle = () => {
    console.log("Battle started!");
  };

  const handleStageSelect = () => {
    console.log("Stage select opened!");
  };

  const handleQuestClick = () => {
    setIsQuestMenuOpen(true);
  };

  const handlePackClick = () => {
    setIsCardModalOpen(true);
  };

  const renderArenaView = () => (
    <>
      <HeaderBar 
        player={mockPlayerData} 
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      <DailyPacks 
        questCount={3} 
        onQuestClick={handleQuestClick}
        packCount={4}
        onPackClick={handlePackClick}
      />
      <StageDisplay stage={mockStageData} />
      <BattleSection
        onBattle={handleBattle}
        onStageSelect={handleStageSelect}
        isPvPEnabled={false}
      />
    </>
  );

  const renderCardsView = () => <CardsMenu />;

  return (
    <div className={styles.container}>
      {activeNav === "arena" ? renderArenaView() : null}
      {activeNav === "cards" ? renderCardsView() : null}
      {/* TODO: implement market view */}
      <BottomNav activeItem={activeNav} onNavigate={setActiveNav} />
      <QuestMenu isOpen={isQuestMenuOpen} onClose={() => setIsQuestMenuOpen(false)} />
      <CardRevealModal 
        isOpen={isCardModalOpen} 
        onClose={() => setIsCardModalOpen(false)} 
      />
      <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
