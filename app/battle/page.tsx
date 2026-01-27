"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import styles from './page.module.css';
import { LoadingScreen } from '../components/game/LoadingScreen';
import { BattlePreparation } from '../components/game/BattlePreparation';
import { BattleArena } from '../components/game/BattleArena';
import { QRISTopupPopup } from '../components/game/QRISTopupPopup';
import { useBattleStore } from '../stores/battleStore';
import { useGameStore } from '../stores/gameStore';
import { useBattle } from '../hooks/useBattle';
import { BATTLE_FEE_AMOUNT } from '../lib/blockchain/contracts';

type BattlePhase = 'loading' | 'preparation' | 'battle' | 'processing' | 'error';

/**
 * BattlePage Component
 * Entry point for battle system with blockchain integration
 * 
 * Flow:
 * 1. Loading screen (animation)
 * 2. Battle preparation (Merkle proof, IDRX approval)
 * 3. Battle arena (on-chain battle execution)
 * 4. Post-battle processing (mark NFT as used, refresh data)
 * 5. Navigate back to home
 */
export default function BattlePage() {
  const router = useRouter();
  const { address } = useAccount();
  const { profile, refreshProfile, refreshInventory, selectCard } = useGameStore();
  const [phase, setPhase] = useState<BattlePhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showQRISPopup, setShowQRISPopup] = useState(false);
  const [battleResult, setBattleResult] = useState<{ won: boolean; txHash: string } | null>(null);
  const { initBattle, resetBattle } = useBattleStore();
  const { state: battleState, markAsUsed, reset: resetBattleHook, prepare } = useBattle();

  // Load profile if not available
  useEffect(() => {
    if (address && !profile) {
      refreshProfile(address);
    }
  }, [address, profile, refreshProfile]);

  // Check if card is selected before allowing battle (immediate check)
  useEffect(() => {
    if (address && profile) {
      if (!profile.selectedCardId || !profile.selectedCard) {
        setError('Please select a card from your inventory before entering battle');
        setPhase('error');
        // Redirect back to home after 2 seconds
        setTimeout(() => {
          router.replace('/home');
        }, 2000);
        return;
      }
    } else if (address && !profile) {
      // If address exists but profile not loaded yet, wait
      // Don't show error yet, let the loading happen
      return;
    } else if (!address) {
      // No wallet connected
      setError('Wallet not connected');
      setPhase('error');
      setTimeout(() => {
        router.replace('/home');
      }, 2000);
    }
  }, [address, profile, router]);

  // Handle loading complete - transition to preparation phase
  const handleLoadComplete = useCallback(() => {
    try {
      // Ensure profile is loaded with selected card
      if (!address) {
        setError('Wallet not connected');
        setPhase('error');
        return;
      }

      if (!profile?.selectedCardId || !profile?.selectedCard) {
        setError('No card selected. Please select a card from your inventory.');
        setPhase('error');
        setTimeout(() => {
          router.replace('/home');
        }, 2000);
        return;
      }

      // Check if card has been used
      if (profile.selectedCard.used) {
        setError('This NFT has already been used in battle. Please select a different card.');
        setPhase('error');
        setTimeout(() => {
          router.replace('/home');
        }, 2000);
        return;
      }

      // Initialize battle with selected card stats
      initBattle({
        atk: profile.selectedCard.atk,
        health: profile.selectedCard.health,
        name: profile.selectedCard.name,
        rarity: profile.selectedCard.rarity,
        token_id: profile.selectedCard.token_id,
        image_url: profile.selectedCard.image_url,
      });
      
      // Move to preparation phase
      setPhase('preparation');
    } catch {
      setError('Failed to initialize battle');
      setPhase('error');
    }
  }, [initBattle, address, profile, router]);

  /**
   * Handle preparation complete - transition to battle arena
   * On-chain battle already executed, now show visual battle animation
   * with pre-determined result
   */
  const handlePreparationComplete = useCallback((result: { won: boolean; txHash: string } | null) => {
    // Store battle result to pass to BattleArena
    setBattleResult(result);
    // Transition to battle phase
    setPhase('battle');
  }, []);

  /**
   * Handle preparation error
   * Check for insufficient IDRX and show QRIS popup, or redirect home
   */
  const handlePreparationError = useCallback((errorMessage: string) => {
    console.error('[BattlePage] Preparation error:', errorMessage);

    const msg = errorMessage.toLowerCase();

    // Treat any "insufficient ... balance / allowance / transfer amount exceeds balance"
    // as IDRX balance problem → arahkan ke QRIS top-up
    const isBalanceLikeError =
      msg.includes('insufficient') &&
      (msg.includes('balance') ||
        msg.includes('allowance') ||
        msg.includes('transfer amount exceeds'));

    if (isBalanceLikeError) {
      console.log('[BattlePage] Showing QRIS popup for insufficient IDRX / allowance issue');
      setShowQRISPopup(true);
      return;
    }

    // Semua error lain (termasuk cancel di wallet) → langsung balik ke home
    console.log('[BattlePage] Redirecting to home due to non-balance error:', errorMessage);
    setError(errorMessage);
    setPhase('error');
    router.replace('/home');
  }, [router]);

  /**
   * Handle QRIS popup close - redirect to home
   */
  const handleQRISClose = useCallback(() => {
    setShowQRISPopup(false);
    router.replace('/home');
  }, [router]);

  /**
   * Handle QRIS top-up complete - retry battle preparation
   */
  const handleQRISTopupComplete = useCallback(async () => {
    setShowQRISPopup(false);
    
    // Retry preparation with refreshed balance
    if (address && profile?.selectedCard?.token_id != null) {
      try {
        await prepare(profile.selectedCard.token_id);
        // If successful, go back to preparation phase
        setPhase('preparation');
      } catch {
        // Still insufficient, show error and go home
        setError('Still insufficient IDRX balance. Please top up and try again.');
        setPhase('error');
        setTimeout(() => {
          router.replace('/home');
        }, 3000);
      }
    }
  }, [address, profile, prepare, router]);

  /**
   * Handle battle end - AFTER visual battle animation completes
   * 
   * Flow:
   * 1. BattleArena shows visual battle (HP going down, attacks, etc)
   * 2. Visual battle ends (victory/defeat)
   * 3. THIS function called
   * 4. Mark NFT as used (cleanup only, battle already executed)
   * 5. Refresh data
   * 6. Navigate home
   * 
   * PHASE 0 ENHANCEMENT: Pass battle tx hash for better tracking
   */
  const handleBattleEnd = useCallback(async () => {
    if (!address || !profile?.selectedCard?.token_id) {
      console.error('[BattlePage] Cannot process battle end: missing data');
      router.replace('/home');
      return;
    }

    const tokenId = profile.selectedCard.token_id;
    const battleTxHash = battleState.battleResult?.txHash || undefined;
    
    try {
      console.log('[BattlePage] 🎯 Visual battle ended, processing cleanup...', {
        tokenId,
        battleTxHash,
        won: battleResult?.won,
      });
      
      // Battle was already executed during preparation, just cleanup now
      
      // Mark NFT as used in database with battle tx hash for tracking
      await markAsUsed(tokenId, battleTxHash);
      
      // IMPORTANT: Deselect the used NFT so user must choose another one
      console.log('[BattlePage] Deselecting used NFT...');
      await selectCard(address, null);
      
      // Refresh data to reflect changes
      await Promise.all([
        refreshInventory(address),
        refreshProfile(address),
      ]);
      
      console.log('[BattlePage] ✅ Post-battle processing complete, NFT deselected');
    } catch (_battleError) {
      console.error('[BattlePage] ❌ Battle cleanup error:', _battleError);
      const errorMessage = _battleError instanceof Error ? _battleError.message : 'Battle cleanup failed';
      setError(errorMessage);
      setPhase('error');
      
      // Show error for 3 seconds then go home
      setTimeout(() => {
        router.replace('/home');
      }, 3000);
      return;
    }
    
    // Cleanup and navigate home immediately
    resetBattle();
    resetBattleHook();
    router.replace('/home');
  }, [address, profile, battleState.battleResult, battleResult, markAsUsed, refreshInventory, refreshProfile, selectCard, resetBattle, resetBattleHook, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetBattle();
      resetBattleHook();
    };
  }, [resetBattle, resetBattleHook]);

  // Render based on phase
  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return <LoadingScreen onLoadComplete={handleLoadComplete} playerRarity={profile?.selectedCard?.rarity || null} />;

      case 'preparation':
        return (
          <BattlePreparation
            onReady={handlePreparationComplete}
            onError={handlePreparationError}
          />
        );

      case 'battle':
        return (
          <BattleArena
            onBattleEnd={handleBattleEnd}
            battleResult={battleResult}
          />
        );

      case 'error':
        return (
          <div className={styles.errorContainer}>
            <div className={styles.errorBox}>
              <div className={styles.errorIcon}>⚠️</div>
              <h1 className={styles.errorTitle}>Cannot Start Battle</h1>
              <p className={styles.errorMessage}>
                {error || 'Something went wrong. Please try again.'}
              </p>
              
              {/* Show specific help based on error type */}
              {error && error.toLowerCase().includes('balance') && (
                <div className={styles.errorHelp}>
                  <p>💡 You need at least 5 IDRX tokens to battle.</p>
                  <p>Please get more IDRX and try again.</p>
                </div>
              )}
              
              {error && error.toLowerCase().includes('approval') && (
                <div className={styles.errorHelp}>
                  <p>💡 Transaction was rejected or failed.</p>
                  <p>Please try again and approve in your wallet.</p>
                </div>
              )}
              
              {error && error.toLowerCase().includes('mint') && (
                <div className={styles.errorHelp}>
                  <p>💡 WIN token minting failed.</p>
                  <p>Please try again and confirm the transaction.</p>
                </div>
              )}
              
              {error && error.toLowerCase().includes('used') && (
                <div className={styles.errorHelp}>
                  <p>💡 This NFT has already been used in battle.</p>
                  <p>Please select a different NFT from your deck.</p>
                </div>
              )}
              
              <p className={styles.errorHint}>Redirecting to home in 3 seconds...</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.battlePageContainer} data-testid="battle-page">
      <div className={styles.mobileFrame}>
        {renderContent()}
        
        {/* QRIS Top-up Popup */}
        {showQRISPopup && battleState.preparation && (
          <QRISTopupPopup
            isOpen={showQRISPopup}
            onClose={handleQRISClose}
            onTopupComplete={handleQRISTopupComplete}
            currentBalance={battleState.preparation.idrxBalance}
            requiredAmount={BATTLE_FEE_AMOUNT}
          />
        )}
      </div>
    </div>
  );
}
