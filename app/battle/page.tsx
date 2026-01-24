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
  const [isExiting, setIsExiting] = useState(false); // Prevent flash during exit
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
          router.replace('/home');
        }, 2000);
        return;
      }

      // Initialize battle with selected card stats (including token_id for character image)
      initBattle({
        atk: profile.selectedCard.atk,
        health: profile.selectedCard.health,
        name: profile.selectedCard.name,
        rarity: profile.selectedCard.rarity,
        token_id: profile.selectedCard.token_id, // Token ID for CharForBattle image
        image_url: profile.selectedCard.image_url, // Optional IPFS URL (not used in battle)
      });
      setPhase('battle');
    } catch {
      setError('Failed to initialize battle');
      setPhase('error');
    }
  }, [initBattle, address, profile, router]);

  /**
   * Handle battle end - navigate back to home
   * 
   * CRITICAL FIX: Prevent battle arena flash during navigation
   * 
   * Strategy:
   * 1. Set isExiting flag FIRST (synchronous, immediate)
   * 2. This triggers early return, preventing any battle renders
   * 3. Then navigate and cleanup
   * 
   * Why This Works:
   * - isExiting=true happens BEFORE React re-renders
   * - Early return prevents BattleArena from rendering again
   * - User sees blank screen instead of battle flash
   * - Navigation completes smoothly
   * 
   * PERSISTENCE FIX: Selected card is NOT cleared after battle
   * - User's card selection persists in database
   * - Works across logout/login sessions
   * - To change card, user selects different one in My Deck
   */
  const handleBattleEnd = useCallback(() => {
    // Step 1: Set exiting flag IMMEDIATELY (synchronous)
    // This prevents any further battle renders
    setIsExiting(true);
    
    // Step 2: Reset battle state (only local state, not database)
    resetBattle();
    
    // Step 3: Navigate to home (will happen in next tick)
    // By this time, component already returned null (no render)
    router.replace('/home');
    
    // ✅ REMOVED: No longer clear selected card from database
    // Selected card persists across battles and logout/login sessions
    // This provides better UX - user keeps their chosen card
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
      setIsExiting(false); // Reset flag on unmount
    };
  }, [resetBattle]);

  // CRITICAL: Prevent battle render during exit
  // This stops the flash/glitch when navigating back to home
  if (isExiting) {
    return <div className={styles.battlePageContainer} />; // Empty container
  }

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
