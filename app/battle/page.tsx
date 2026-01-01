"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import styles from './page.module.css';
import { LoadingScreen } from '../components/game/LoadingScreen';
import { BattleArena } from '../components/game/BattleArena';
import { useBattleStore } from '../stores/battleStore';
import { useGameStore } from '../stores/gameStore';

type BattlePhase = 'loading' | 'battle' | 'error';

/**
 * BattlePage Component
 * Entry point for battle system
 * Manages flow: loading → battle → result → home
 */
export default function BattlePage() {
  const router = useRouter();
  const { address } = useAccount();
  const { profile, refreshProfile } = useGameStore();
  const [phase, setPhase] = useState<BattlePhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const { initBattle, resetBattle } = useBattleStore();

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
          router.push('/home');
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
        router.push('/home');
      }, 2000);
    }
  }, [address, profile, router]);

  // Handle loading complete
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
          router.push('/home');
        }, 2000);
        return;
      }

      // Initialize battle with selected card stats (including rarity for character image)
      initBattle({
        atk: profile.selectedCard.atk,
        health: profile.selectedCard.health,
        name: profile.selectedCard.name,
        rarity: profile.selectedCard.rarity,
        image_url: profile.selectedCard.image_url, // Optional, not used in battle
      });
      setPhase('battle');
    } catch (err) {
      setError('Failed to initialize battle');
      setPhase('error');
    }
  }, [initBattle, address, profile, router]);

  // Handle battle end - navigate back to home
  const handleBattleEnd = useCallback(() => {
    resetBattle();
    router.push('/home');
  }, [resetBattle, router]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    setError(null);
    setPhase('loading');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetBattle();
    };
  }, [resetBattle]);

  // Render based on phase
  const renderContent = () => {
    switch (phase) {
      case 'loading':
        return <LoadingScreen onLoadComplete={handleLoadComplete} playerRarity={profile?.selectedCard?.rarity || null} />;

      case 'battle':
        return <BattleArena onBattleEnd={handleBattleEnd} />;

      case 'error':
        return (
          <div className={styles.errorContainer}>
            <h1 className={styles.errorTitle}>Error</h1>
            <p className={styles.errorMessage}>
              {error || 'Something went wrong. Please try again.'}
            </p>
            <button className={styles.retryButton} onClick={handleRetry}>
              Retry
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
