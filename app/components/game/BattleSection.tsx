"use client";

import Image from "next/image";
import styles from "./BattleSection.module.css";

interface BattleSectionProps {
  onStageSelect?: () => void;
  onBattle?: () => void;
  isPvPEnabled?: boolean;
}

export function BattleSection({ onStageSelect, onBattle, isPvPEnabled = false }: BattleSectionProps) {
  return (
    <div className={styles.container}>
      {/* Stage Select Button */}
      <button className={styles.stageButton} onClick={onStageSelect}>
        <Image 
          src="/game/icons/stage-button.png" 
          alt="Map" 
          width={64} 
          height={60}
          className={styles.stageButtonImage}
        />
        <span className={styles.stageLabel}>STAGE</span>
      </button>

      {/* Battle Button */}
      <button className={styles.battleButton} onClick={onBattle}>
        <Image 
          src="/game/icons/battle-button.png" 
          alt="Battle" 
          width={153} 
          height={54}
          className={styles.battleButtonImage}
        />
        <span className={styles.battleLabel}>BATTLE</span>
      </button>

      {/* PvP Button */}
      <button className={styles.pvpButton} onClick={() => {}}>
        <Image 
          src="/game/icons/swords.png" 
          alt="PvP" 
          width={51} 
          height={54}
          className={styles.pvpButtonImage}
        />
        <span className={styles.pvpLabel}>PVP</span>
      </button>
    </div>
  );
}
