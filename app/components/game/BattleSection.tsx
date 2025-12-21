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
      <button className={styles.sideButton} onClick={onStageSelect}>
        <Image 
          src="/game/icons/map.svg" 
          alt="Map" 
          width={28} 
          height={28}
        />
        <span className={styles.sideLabel}>STAGE SELECT</span>
      </button>

      {/* Battle Button */}
      <button className={styles.battleButton} onClick={onBattle}>
        <Image 
          src="/game/icons/swords.png" 
          alt="Battle" 
          width={32} 
          height={32}
          className={styles.battleIcon}
        />
        <span className={styles.battleLabel}>BATTLE</span>
      </button>

      {/* PvP Button */}
      <button 
        className={`${styles.sideButton} ${styles.pvpButton}`} 
        disabled={!isPvPEnabled}
      >
        <div className={styles.pvpIconContainer}>
          <Image 
            src="/game/icons/swords.png" 
            alt="PvP" 
            width={24} 
            height={24}
            className={styles.pvpSwords}
          />
          {!isPvPEnabled && (
            <Image 
              src="/game/icons/lock.svg" 
              alt="Locked" 
              width={16} 
              height={16}
              className={styles.lockIcon}
            />
          )}
        </div>
        <span className={styles.sideLabel}>PvP</span>
        {!isPvPEnabled && <span className={styles.comingSoon}>Coming Soon</span>}
      </button>
    </div>
  );
}
