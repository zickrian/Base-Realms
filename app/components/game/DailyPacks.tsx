"use client";

import React, { memo } from "react";
import Image from "next/image";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { useGameStore } from "../../stores/gameStore";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import styles from "./DailyPacks.module.css";

interface DailyPacksProps {
  onQuestClick?: () => void;
  onPackClick?: () => void;
}

export const DailyPacks = memo(function DailyPacks({ onQuestClick, onPackClick }: DailyPacksProps) {
  const { quests } = useGameStore();
  const { playSound } = useSoundEffect();
  
  // Count active/completed quests (not claimed)
  const questCount = React.useMemo(() => {
    return quests.filter(q => q.status === 'active' || q.status === 'completed').length;
  }, [quests]);

  const handlePackClick = () => {
    // Play sound effect
    playSound('card.mp3');
    // Trigger callback
    onPackClick?.();
  };

  const handleQuestClick = () => {
    // Play sound effect
    playSound('card.mp3');
    // Trigger callback
    onQuestClick?.();
  };

  return (
    <div className={styles.container}>
      <div className={styles.packsSection}>
        <span className={styles.label}>FREE DAILY PACKS</span>
        <button className={styles.packButton} onClick={handlePackClick}>
          <Image
            src={getGameIconUrl("packs.png")}
            alt="Daily Packs"
            width={60}
            height={60}
            className={styles.packButtonImage}
          />
        </button>
      </div>

      <div className={styles.questSection}>
        <span className={styles.questLabel}>QUEST</span>
        <button className={styles.questButton} onClick={handleQuestClick}>
          <Image
            src={getGameIconUrl("quest-button.png")}
            alt="Quests"
            width={60}
            height={60}
            className={styles.questButtonImage}
          />
          {questCount > 0 && (
            <div className={styles.questBadge}>{questCount}</div>
          )}
        </button>
      </div>
    </div>
  );
});
