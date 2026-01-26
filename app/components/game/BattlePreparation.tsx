/**
 * BattlePreparation Component
 * 
 * Handles pre-battle checks and approvals before entering battle arena:
 * 1. Validates selected NFT and gets token_id
 * 2. Generates Merkle proof
 * 3. Checks IDRX balance (≥5 IDRX required)
 * 4. Checks/handles IDRX approval
 * 5. Transitions to battle arena when ready
 * 
 * @module BattlePreparation
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useGameStore } from '@/app/stores/gameStore';
import { useBattle } from '@/app/hooks/useBattle';
import styles from './BattlePreparation.module.css';

interface BattlePreparationProps {
  onReady: () => void;
  onError: (error: string) => void;
}

/**
 * Pre-battle preparation screen
 * Shows loading and approval states before battle
 */
export const BattlePreparation: React.FC<BattlePreparationProps> = ({
  onReady,
  onError,
}) => {
  const { address } = useAccount();
  const { profile } = useGameStore();
  const { state, prepare, approve } = useBattle();
  const [currentStep, setCurrentStep] = useState<string>('Initializing...');

  useEffect(() => {
    const initializeBattle = async () => {
      if (!address) {
        onError('Wallet not connected');
        return;
      }

      if (!profile?.selectedCard) {
        onError('No card selected. Please select a card from your deck.');
        return;
      }

      const tokenId = profile.selectedCard.token_id;
      if (!tokenId && tokenId !== 0) {
        onError('Selected card does not have a valid token ID. Please select an NFT card.');
        return;
      }

      try {
        // Step 1: Prepare battle (get proof, check balance/allowance)
        setCurrentStep('Preparing battle data...');
        await prepare(tokenId);

        // Check for errors after preparation
        if (state.error) {
          onError(state.error);
          return;
        }

        // Step 2: Check if approval needed
        if (state.preparation?.needsApproval) {
          setCurrentStep('Requesting IDRX approval...');
          try {
            await approve();
            setCurrentStep('Approval confirmed!');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Approval failed';
            onError(errorMessage);
            return;
          }
        }

        // Step 3: All checks passed, ready for battle
        setCurrentStep('Entering battle arena...');
        setTimeout(() => {
          onReady();
        }, 500);

      } catch (error) {
        console.error('[BattlePreparation] Initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to prepare battle';
        onError(errorMessage);
      }
    };

    initializeBattle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Show loading screen with current step
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.spinner}>⚔️</div>
        <h2 className={styles.title}>Preparing for Battle</h2>
        <p className={styles.step}>{currentStep}</p>
        
        {state.isPreparing && (
          <p className={styles.detail}>Generating Merkle proof...</p>
        )}
        
        {state.isApproving && (
          <p className={styles.detail}>
            Please approve the transaction in your wallet to allow battle payment.
          </p>
        )}
        
        {state.preparation && !state.preparation.hasEnoughIDRX && (
          <div className={styles.error}>
            <p>❌ Insufficient IDRX balance</p>
            <p>You need at least 5 IDRX to battle.</p>
          </div>
        )}
      </div>
    </div>
  );
};
