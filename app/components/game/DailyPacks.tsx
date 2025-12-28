"use client";

import { getGameIconUrl } from "../../utils/supabaseStorage";
import styles from "./DailyPacks.module.css";

interface DailyPacksProps {
  questCount: number;
  onQuestClick?: () => void;
  packCount?: number;
  onPackClick?: () => void;
}

export function DailyPacks({ questCount, onQuestClick, packCount = 4, onPackClick }: DailyPacksProps) {
  return (
    <div className={styles.container}>
      <div className={styles.packsSection}>
        <span className={styles.label}>FREE DAILY PACKS</span>
        <button className={styles.packButton} onClick={onPackClick}>
          {/* Using standard img to avoid React removeChild errors with Next/Image in dynamic buttons */}
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
          {/* Using standard img to avoid React removeChild errors with Next/Image in dynamic buttons */}
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
