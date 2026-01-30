"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Lock } from "lucide-react";
import { useGameStore } from "../../stores/gameStore";
import styles from "./BattleSection.module.css";

interface BattleSectionProps {
  onStageSelect?: () => void;
  onBattle?: () => void;
  onSwapClick?: () => void;
  onBoardClick?: () => void;
  isSwapEnabled?: boolean;
}

export function BattleSection({ onStageSelect: _onStageSelect, onBattle, onSwapClick, onBoardClick, isSwapEnabled: _isSwapEnabled = false }: BattleSectionProps) {
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
      {/* Unified Base Card containing Stage, Battle, and Swap */}
      <div className={styles.unifiedBaseCard}>

        {/* Left: Board Button */}
        <button key="board-btn" className={styles.stageButton} onClick={onBoardClick}>
          <div className={styles.cardInner}>
            <Image
              src="/game/icons/lead.svg"
              alt="Board"
              className={styles.pannelIcon}
              width={40}
              height={40}
            />
            <span className={styles.buttonLabel} suppressHydrationWarning>BOARD</span>
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
              <Lock size={32} className={styles.lockEmoji} />
            ) : (
              <span className={styles.battleLabel} suppressHydrationWarning>BATTLE</span>
            )}
          </div>
        </button>

        {/* Right: Swap Button */}
        <button key="swap-btn" className={styles.swapButton} onClick={onSwapClick}>
          <div className={styles.cardInnerSwap}>
            <Image
              src="/game/icons/swap.svg"
              alt="Swap"
              className={styles.pannelIcon}
              width={40}
              height={40}
            />
            <span className={styles.buttonLabel} suppressHydrationWarning>SWAP</span>
          </div>
        </button>

      </div>
    </div>
  );
}
