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
import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { base } from 'viem/chains';
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
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { profile } = useGameStore();
  const { state, prepare, approve, mintWin } = useBattle();
  const [currentStep, setCurrentStep] = useState<string>('Initializing...');
  const [isReadyForBattle, setIsReadyForBattle] = useState(false);

  // Step 1: Check chain and switch if needed, then initialize battle
  useEffect(() => {
    const initializeBattle = async () => {
      if (!address) {
        onError('Wallet not connected');
        return;
      }

      // Check if we need to switch chain
      if (chainId !== base.id) {
        setCurrentStep('Switching to Base network...');
        try {
          switchChain({ chainId: base.id });
          // Don't continue here - wait for chainId to update
          return;
        } catch (error) {
          console.error('[BattlePreparation] Chain switch error:', error);
          onError('Please switch to Base network to battle.');
          return;
        }
      }

      // Already on Base, proceed with battle preparation
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
        // Prepare battle (get proof, check balance/allowance)
        setCurrentStep('Checking IDRX balance...');
        console.log('[BattlePreparation] Preparing battle for token:', tokenId);
        console.log('[BattlePreparation] Wallet address:', address);
        
        await prepare(tokenId);
        
        console.log('[BattlePreparation] Battle prepared successfully');
        setIsReadyForBattle(true);
      } catch (error) {
        console.error('[BattlePreparation] Initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to prepare battle';
        onError(errorMessage);
      }
    };

    initializeBattle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId]); // Re-run when chainId changes (after switch)

  // Handle state changes after preparation
  useEffect(() => {
    const handlePreparationState = async () => {
      if (!state.preparation || !isReadyForBattle) return;

      console.log('[BattlePreparation] Preparation state:', {
        hasEnoughIDRX: state.preparation.hasEnoughIDRX,
        needsApproval: state.preparation.needsApproval,
        hasWinTokenMinted: state.preparation.hasWinTokenMinted,
        idrxBalance: state.preparation.idrxBalance,
        currentAllowance: state.preparation.currentAllowance,
      });

      // Check for insufficient balance FIRST - must exit immediately
      if (!state.preparation.hasEnoughIDRX) {
        console.error('[BattlePreparation] Insufficient IDRX balance - triggering error callback');
        onError('Insufficient IDRX balance. You need at least 5 IDRX to battle.');
        return; // CRITICAL: Stop here, don't proceed
      }

      // Step 1: MUST approve IDRX first
      if (state.preparation.needsApproval && !state.isApproving) {
        setCurrentStep('⚔️ Step 1/2: Approving IDRX for battle fee...');
        try {
          await approve();
          setCurrentStep('✅ IDRX approved! Proceeding to WIN token...');
          // Continue to next step after approval
        } catch (error) {
          console.error('[BattlePreparation] Approval error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Approval failed. You must approve IDRX spending to battle.';
          onError(errorMessage);
          return; // Exit on approval failure
        }
      }

      // Step 2: MUST mint WIN token before battle
      // This is CRITICAL - contract requires user to have WIN token first
      if (!state.preparation.hasWinTokenMinted && !state.isMinting && !state.preparation.needsApproval) {
        setCurrentStep('🏆 Step 2/2: Minting WIN token (victory reward)...');
        try {
          await mintWin();
          setCurrentStep('✅ WIN token minted! You can now battle!');
          
          // ONLY proceed to battle after BOTH requirements met
          setTimeout(() => {
            setCurrentStep('⚔️ Entering battle arena...');
            onReady();
          }, 1000);
        } catch (error) {
          console.error('[BattlePreparation] WIN token minting error:', error);
          const errorMessage = error instanceof Error ? error.message : 'WIN token minting failed. You must mint WIN token before battle.';
          onError(errorMessage);
          return; // Exit on minting failure
        }
      } else if (state.preparation.hasWinTokenMinted && !state.preparation.needsApproval) {
        // Both requirements already met - proceed directly to battle
        setCurrentStep('✅ All requirements met! Entering battle...');
        setTimeout(() => {
          onReady();
        }, 500);
      }
    };

    handlePreparationState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.preparation, state.isApproving, state.isMinting, isReadyForBattle]); // Run when preparation states change

  // SAFETY: If error exists in state, call onError callback
  useEffect(() => {
    if (state.error) {
      console.error('[BattlePreparation] Battle state error detected:', state.error);
      onError(state.error);
    }
  }, [state.error, onError]);

  // Show loading screen with current step
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.spinner}>⚔️</div>
        <h2 className={styles.title}>Preparing for Battle</h2>
        <p className={styles.step}>{currentStep}</p>
        
        {state.isPreparing && (
          <p className={styles.detail}>Validating NFT and generating Merkle proof...</p>
        )}
        
        {isSwitchingChain && (
          <p className={styles.detail}>
            Please confirm the network switch to Base in your wallet.
          </p>
        )}
        
        {state.isApproving && (
          <div className={styles.detail}>
            <p>Please approve the IDRX transaction in your wallet.</p>
            <p className={styles.hint}>This allows the battle contract to charge 5 IDRX battle fee.</p>
          </div>
        )}
        
        {state.isMinting && (
          <div className={styles.detail}>
            <p>Please confirm WIN token minting in your wallet.</p>
            <p className={styles.hint}>This token will be awarded to you if you win the battle!</p>
          </div>
        )}
        
        {state.preparation && !state.preparation.hasEnoughIDRX && (
          <div className={styles.error}>
            <p>❌ Insufficient IDRX balance</p>
            <p>You need at least 5 IDRX to battle.</p>
            <p className={styles.hint}>Please get IDRX tokens from the shop or faucet.</p>
          </div>
        )}
        
        {state.preparation && state.preparation.hasEnoughIDRX && (
          <div className={styles.requirements}>
            <p className={styles.checklistTitle}>Battle Requirements:</p>
            <div className={styles.checklist}>
              <div className={state.preparation.needsApproval ? styles.pending : styles.completed}>
                {!state.preparation.needsApproval ? '✅' : '⏳'} IDRX Approval (5 IDRX battle fee)
              </div>
              <div className={state.preparation.hasWinTokenMinted ? styles.completed : styles.pending}>
                {state.preparation.hasWinTokenMinted ? '✅' : '⏳'} WIN Token Minted (victory reward)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
