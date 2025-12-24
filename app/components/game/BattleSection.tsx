"use client";

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
        {/* Using standard img to avoid React removeChild errors with Next/Image in dynamic buttons */}
        <img
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
        <div className={styles.battleContent}>
          <div className={styles.iconWrapper}>
            {/* Using standard img to avoid React removeChild errors with Next/Image in dynamic buttons */}
            <img
              src="/game/icons/swords.png"
              alt="Battle"
              width={40}
              height={40}
              className={styles.battleIcon}
            />
          </div>
          <span className={styles.battleLabel}>BATTLE</span>
        </div>
      </button>

      {/* PvP Button */}
      <button className={styles.pvpButton} onClick={() => { }}>
        {/* Using standard img to avoid React removeChild errors with Next/Image in dynamic buttons */}
        <img
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
