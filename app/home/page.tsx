"use client";

import { useState } from "react";
import { HeaderBar, DailyPacks, StageDisplay, BattleSection, BottomNav } from "../components/game";
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
  const [activeNav, setActiveNav] = useState<'cards' | 'arena' | 'market'>('arena');

  const handleBattle = () => {
    console.log("Battle started!");
  };

  const handleStageSelect = () => {
    console.log("Stage select opened!");
  };

  const handleQuestClick = () => {
    console.log("Quests opened!");
  };

  return (
    <div className={styles.container}>
      <HeaderBar player={mockPlayerData} />
      <DailyPacks questCount={3} onQuestClick={handleQuestClick} />
      <StageDisplay stage={mockStageData} />
      <BattleSection 
        onBattle={handleBattle}
        onStageSelect={handleStageSelect}
        isPvPEnabled={false}
      />
      <BottomNav activeItem={activeNav} onNavigate={setActiveNav} />
    </div>
  );
}
