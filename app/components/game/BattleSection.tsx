"use client";

import { useRouter } from "next/navigation";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import styles from "./BattleSection.module.css";

interface BattleSectionProps {
  onStageSelect?: () => void;
  onBattle?: () => void;
  isPvPEnabled?: boolean;
}

export function BattleSection({ onStageSelect, onBattle, isPvPEnabled: _isPvPEnabled = false }: BattleSectionProps) {
  const router = useRouter();

  // Handle battle button click - navigate to battle page
  const handleBattleClick = () => {
    if (onBattle) {
      onBattle();
    }
    router.push('/battle');
  };
  return (
    <div className={styles.wrapper}>
      {/* Unified Base Card containing Stage, Battle, and PvP */}
      <div className={styles.unifiedBaseCard}>

        {/* Left: Stage Button */}
        <button key="stage-btn" className={styles.stageButton} onClick={onStageSelect}>
          <div className={styles.cardInner}>
            <img
              src={getGameIconUrl("stage-button.png")}
              alt="Stats"
              className={styles.pannelIcon}
            />
            <span className={styles.buttonLabel} suppressHydrationWarning>STATS</span>
          </div>
        </button>

        {/* Center: Battle Button */}
        <button key="battle-btn" className={styles.battleButton} onClick={handleBattleClick}>
          <div className={styles.battleContent}>
            <span className={styles.battleLabel} suppressHydrationWarning>BATTLE</span>
          </div>
        </button>

        {/* Right: PvP Button */}
        <button key="pvp-btn" className={styles.pvpButton} onClick={() => { }}>
          <div className={styles.cardInnerPvP}>
            <img
              src={getGameIconUrl("swords.png")}
              alt="PvP"
              className={styles.pannelIcon}
            />
            <span className={styles.buttonLabel} suppressHydrationWarning>PVP</span>
          </div>
        </button>

      </div>
    </div>
  );
}
