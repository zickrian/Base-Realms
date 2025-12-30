"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { LoadingScreen } from '../components/game/LoadingScreen';
import { BattleArena } from '../components/game/BattleArena';
import { useBattleStore } from '../stores/battleStore';

type BattlePhase = 'loading' | 'battle' | 'error';

/**
 * BattlePage Component
 * Entry point for battle system
 * Manages flow: loading → battle → result → home
 */
export default function BattlePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<BattlePhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const { initBattle, resetBattle } = useBattleStore();

  // Handle loading complete
  const handleLoadComplete = useCallback(() => {
    try {
      initBattle();
      setPhase('battle');
    } catch {
      setError('Failed to initialize battle');
      setPhase('error');
    }
  }, [initBattle]);

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
        return <LoadingScreen onLoadComplete={handleLoadComplete} />;

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
      {renderContent()}
    </div>
  );
}
