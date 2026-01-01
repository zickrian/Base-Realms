"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { useGameStore } from "../../stores/gameStore";
import { getGameIconUrl } from "../../utils/supabaseStorage";
import styles from "./BattleSection.module.css";

interface BattleSectionProps {
  onStageSelect?: () => void;
  onBattle?: () => void;
  isPvPEnabled?: boolean;
}

export function BattleSection({ onStageSelect, onBattle, isPvPEnabled: _isPvPEnabled = false }: BattleSectionProps) {
  const router = useRouter();
  const { profile } = useGameStore();

  // Handle battle button click - navigate to battle page immediately
  const handleBattleClick = () => {
    // Check if card is selected - strict validation
    if (!profile) {
      alert('Profile not loaded. Please wait...');
      return;
    }

    if (!profile.selectedCardId || !profile.selectedCard) {
      alert('Please select a card from your inventory before entering battle!\n\nGo to CARDS menu and click "USE" on a card.');
      return;
    }

    // Use startTransition for non-blocking navigation
    // This ensures UI responds immediately
    startTransition(() => {
      router.push('/battle');
    });
    // Call callback if provided (non-blocking, fire and forget)
    if (onBattle) {
      onBattle();
    }
  };

  // Check if battle button should be disabled
  const isBattleDisabled = !profile || !profile.selectedCardId || !profile.selectedCard;
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
        <button 
          key="battle-btn" 
          className={`${styles.battleButton} ${isBattleDisabled ? styles.battleButtonLocked : ''}`}
          onClick={handleBattleClick}
          disabled={isBattleDisabled}
          title={isBattleDisabled ? 'Please select a card from your inventory first' : 'Enter Battle'}
        >
          <div className={styles.battleContent}>
            {isBattleDisabled ? (
              <span className={styles.lockEmoji}>🔒</span>
            ) : (
              <span className={styles.battleLabel} suppressHydrationWarning>BATTLE</span>
            )}
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
