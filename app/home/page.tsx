"use client";

import { useState } from "react";
import {
  HeaderBar,
  DailyPacks,
  StageDisplay,
  BattleSection,
  BottomNav,
  CardsMenu,
  QuestMenu,
} from "../components/game";
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
  const [activeNav, setActiveNav] = useState<"cards" | "arena" | "market">(
    "arena"
  );
  const [isQuestMenuOpen, setIsQuestMenuOpen] = useState(false);

  const handleBattle = () => {
    console.log("Battle started!");
  };

  const handleStageSelect = () => {
    console.log("Stage select opened!");
  };

  const handleQuestClick = () => {
    setIsQuestMenuOpen(true);
  };

  const renderArenaView = () => (
    <>
      <HeaderBar player={mockPlayerData} />
      <DailyPacks questCount={3} onQuestClick={handleQuestClick} />
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
    </div>
  );
}
