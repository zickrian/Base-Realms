"use client";

import React from "react";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import { useGameStore } from "../../stores/gameStore";
import styles from "./DailyPacks.module.css";

interface DailyPacksProps {
  onQuestClick?: () => void;
  onPackClick?: () => void;
}

export function DailyPacks({ onQuestClick, onPackClick }: DailyPacksProps) {
  const { quests } = useGameStore();
  
  // Count active/completed quests (not claimed)
  const questCount = React.useMemo(() => {
    return quests.filter(q => q.status === 'active' || q.status === 'completed').length;
  }, [quests]);

  return (
    <div className={styles.container}>
      <div className={styles.packsSection}>
        <span className={styles.label}>FREE DAILY PACKS</span>
        <button className={styles.packButton} onClick={onPackClick}>
          <img
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
        <button className={styles.questButton} onClick={onQuestClick}>
          <img
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
}
