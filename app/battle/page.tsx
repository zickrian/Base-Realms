"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import styles from './page.module.css';
import { LoadingScreen } from '../components/game/LoadingScreen';
import { BattlePreparation } from '../components/game/BattlePreparation';
import { BattleArena } from '../components/game/BattleArena';
import { useBattleStore } from '../stores/battleStore';
import { useGameStore } from '../stores/gameStore';
import { useBattle } from '../hooks/useBattle';

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
  const { profile, refreshProfile, refreshInventory } = useGameStore();
  const [phase, setPhase] = useState<BattlePhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const { initBattle, resetBattle } = useBattleStore();
  const { state: battleState, battle: executeBattle, markAsUsed, reset: resetBattleHook } = useBattle();

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
   * Battle arena will show visual battle animation FIRST
   * On-chain execution happens AFTER animation completes
   */
  const handlePreparationComplete = useCallback(() => {
    // Just transition to battle phase
    // BattleArena will handle the visual battle
    setPhase('battle');
  }, []);

  /**
   * Handle preparation error
   */
  const handlePreparationError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setPhase('error');
    setTimeout(() => {
      router.replace('/home');
    }, 3000);
  }, [router]);

  /**
   * Handle battle end - AFTER visual battle animation completes
   * 
   * Flow:
   * 1. BattleArena shows visual battle (HP going down, attacks, etc)
   * 2. Visual battle ends (victory/defeat)
   * 3. THIS function called
   * 4. Execute ACTUAL on-chain battle transaction
   * 5. Mark NFT as used
   * 6. Refresh data
   * 7. Navigate home
   */
  const handleBattleEnd = useCallback(async () => {
    if (!address || !profile?.selectedCard?.token_id) {
      console.error('[BattlePage] Cannot process battle end: missing data');
      router.replace('/home');
      return;
    }

    const tokenId = profile.selectedCard.token_id;
    
    // Show processing screen
    setPhase('processing');
    
    try {
      console.log('[BattlePage] Visual battle ended, executing on-chain transaction...');
      
      // Execute ACTUAL battle on blockchain
      await executeBattle();
      
      if (battleState.error) {
        setError(battleState.error);
        setPhase('error');
        return;
      }
      
      console.log('[BattlePage] On-chain battle executed successfully');
      
      // Mark NFT as used in database
      await markAsUsed(tokenId);
      
      // Refresh data to reflect changes
      await Promise.all([
        refreshInventory(address),
        refreshProfile(address),
      ]);
      
      console.log('[BattlePage] Post-battle processing complete');
    } catch (error) {
      console.error('[BattlePage] Battle execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Battle execution failed';
      setError(errorMessage);
      setPhase('error');
      
      // Show error for 3 seconds then go home
      setTimeout(() => {
        router.replace('/home');
      }, 3000);
      return;
    }
    
    // Cleanup and navigate home
    setIsExiting(true);
    resetBattle();
    resetBattleHook();
    
    // Small delay to show success
    setTimeout(() => {
      router.replace('/home');
    }, 1000);
  }, [address, profile, executeBattle, battleState, markAsUsed, refreshInventory, refreshProfile, resetBattle, resetBattleHook, router]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    setError(null);
    setPhase('loading');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetBattle();
      resetBattleHook();
      setIsExiting(false);
    };
  }, [resetBattle, resetBattleHook]);

  // Prevent render during exit or processing
  if (isExiting || phase === 'processing') {
    return (
      <div className={styles.battlePageContainer}>
        <div className={styles.mobileFrame}>
          <div className={styles.processingScreen}>
            <div className={styles.processingSpinner}>⚔️</div>
            <p className={styles.processingText}>Processing battle results...</p>
          </div>
        </div>
      </div>
    );
  }

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
        return <BattleArena onBattleEnd={handleBattleEnd} />;

      case 'error':
        return (
          <div className={styles.errorContainer}>
            <h1 className={styles.errorTitle}>Error</h1>
            <p className={styles.errorMessage}>
              {error || 'Something went wrong. Please try again.'}
            </p>
            <button className={styles.retryButton} onClick={() => router.replace('/home')}>
              Return to Home
            </button>
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
      </div>
    </div>
  );
}
