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
 * Note: No manual chain switching needed - wagmi + OnchainKit automatically
 * handle chain switching when chainId is specified in writeContract calls.
 * 
 * @module BattlePreparation
 */

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { useGameStore } from '@/app/stores/gameStore';
import { useBattle } from '@/app/hooks/useBattle';
import {
  IDRX_TOKEN_ADDRESS,
  BASE_CHAIN_ID,
  BATTLE_FEE_IDRX,
  hasEnoughIDRXForBattle,
  formatIDRXBalance
} from '@/app/lib/blockchain/tokenConfig';
import styles from './BattlePreparation.module.css';

interface BattlePreparationProps {
  onReady: (battleResult: { won: boolean; txHash: string } | null) => void;
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
  const { state, prepare, approve, battle: executeBattle } = useBattle();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<string>('Initializing...');
  const [isReadyForBattle, setIsReadyForBattle] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  
  // =========================================================================
  // GUARD FLAG: Prevent duplicate battle execution
  // This prevents race condition where executeBattle is called twice:
  // 1. From setTimeout after mintWin success
  // 2. From useEffect re-run when state.preparation.hasWinTokenMinted updates
  // =========================================================================
  const [battleExecutionStarted, setBattleExecutionStarted] = useState(false);

  // =========================================================================
  // IDRX BALANCE - Using wagmi hook (same as HeaderBar for consistency)
  // This is the source of truth for balance checking
  // =========================================================================
  const { data: idrxBalanceData } = useBalance({
    address: address,
    token: IDRX_TOKEN_ADDRESS,
    chainId: BASE_CHAIN_ID,
  });

  // Parse IDRX balance from wagmi data
  const idrxBalance = useMemo(() => {
    if (!idrxBalanceData || !address) return 0;
    return parseFloat(formatUnits(idrxBalanceData.value, idrxBalanceData.decimals));
  }, [idrxBalanceData, address]);

  // Check if balance is sufficient for battle (uses shared constant)
  const hasEnoughBalance = useMemo(() => {
    return hasEnoughIDRXForBattle(idrxBalance);
  }, [idrxBalance]);

  // Redirect to home after countdown
  const startRedirectCountdown = useCallback(() => {
    setRedirectCountdown(3);
  }, []);

  // Handle countdown and redirect
  useEffect(() => {
    if (redirectCountdown === null) return;

    if (redirectCountdown <= 0) {
      console.log('[BattlePreparation] Redirecting to home due to insufficient IDRX');
      router.push('/home');
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, router]);

  // Initialize battle preparation
  // Note: No manual chain switching needed - wagmi + OnchainKit handle it automatically
  // when chainId is specified in writeContract calls (approve, battle)
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
        // Prepare battle (get proof, check balance/allowance)
        setCurrentStep('Checking IDRX balance...');
        console.log('[BattlePreparation] Preparing battle for token:', tokenId);
        console.log('[BattlePreparation] Wallet address:', address);

        await prepare(tokenId);

        // Note: isReadyForBattle will be set in the next effect when we verify state.preparation
        console.log('[BattlePreparation] Battle preparation API call completed - awaiting state update');

        // Set this after delay to let state update first
        setTimeout(() => {
          setIsReadyForBattle(true);
        }, 100);
      } catch (error) {
        console.error('[BattlePreparation] Initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to prepare battle';
        onError(errorMessage);
      }
    };

    initializeBattle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]); // Only re-run when address changes

  // Handle state changes after preparation
  useEffect(() => {
    const handlePreparationState = async () => {
      if (!state.preparation || !isReadyForBattle) return;

      // Log both battleService balance AND wagmi balance for debugging
      console.log('[BattlePreparation] Preparation state:', {
        // From battleService (may be unreliable)
        battleServiceBalance: state.preparation.idrxBalance,
        battleServiceHasEnough: state.preparation.hasEnoughIDRX,
        usedOnChain: state.preparation.usedOnChain,
        // From wagmi (same as HeaderBar - reliable)
        wagmiBalance: idrxBalance,
        wagmiHasEnough: hasEnoughBalance,
        // Other preparation data
        needsApproval: state.preparation.needsApproval,
        hasWinTokenMinted: state.preparation.hasWinTokenMinted,
        currentAllowance: state.preparation.currentAllowance,
      });

      // =========================================================================
      // RULE: If NFT already used on-chain, block battle entirely
      // =========================================================================
      if (state.preparation.usedOnChain) {
        console.warn('[BattlePreparation] NFT already used in battle (on-chain). Blocking battle.', {
          tokenId: state.preparation.tokenId,
        });
        setCurrentStep('❌ This NFT has already been used in battle.');
        onError('This NFT has already been used in battle. Please select a different card.');
        return; // Stop here, do not continue to balance / approval / battle
      }

      // =========================================================================
      // USE WAGMI BALANCE AS SOURCE OF TRUTH (same as HeaderBar)
      // This ensures consistency between home page display and battle check
      // =========================================================================
      if (!hasEnoughBalance) {
        console.log('[BattlePreparation] Balance check details (using wagmi):', {
          wagmiBalance: idrxBalance,
          requiredBalance: BATTLE_FEE_IDRX,
          hasEnoughBalance: hasEnoughBalance,
        });

        // Start redirect countdown - will redirect to home after 3 seconds
        startRedirectCountdown();

        // Show appropriate error message based on balance
        if (idrxBalance === 0) {
          console.error('[BattlePreparation] IDRX balance is 0');
          setCurrentStep('⚠️ No IDRX balance detected');
        } else {
          // Balance is non-zero but less than required
          console.error('[BattlePreparation] Insufficient IDRX balance');
          setCurrentStep(`❌ Insufficient IDRX: ${formatIDRXBalance(idrxBalance)} / ${BATTLE_FEE_IDRX}.00 IDRX`);
        }
        return; // CRITICAL: Stop here, don't proceed
      }

      // Step 1: MUST approve IDRX first
      if (state.preparation.needsApproval && !state.isApproving) {
        setCurrentStep('⚔️ Approving IDRX for battle fee...');
        try {
          await approve();
          setCurrentStep('✅ IDRX approved! Starting battle...');
          // Continue to battle after approval
        } catch (error) {
          console.error('[BattlePreparation] Approval error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Approval failed. You must approve IDRX spending to battle.';
          onError(errorMessage);
          return; // Exit on approval failure
        }
      }

      // Step 2: Execute battle on-chain
      // Battle contract will:
      // - Transfer 5 IDRX from user
      // - Run battle simulation on-chain
      // - Mint WIN token / handle result internally
      // - Mark NFT as used
      if (!state.preparation.needsApproval && !state.isBattling) {
        // GUARD: Prevent duplicate execution if battle already started
        if (battleExecutionStarted) {
          console.log('[BattlePreparation] Battle execution already started, skipping duplicate call');
          return;
        }

        // Mark battle execution as started to prevent race condition
        console.log('[BattlePreparation] Starting battle execution');
        setBattleExecutionStarted(true);

        setCurrentStep('⚔️ Executing battle on-chain...');
        try {
          await executeBattle();
        } catch (error) {
          console.error('[BattlePreparation] Battle execution error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Battle execution failed';
          // Reset flag on error to allow retry
          setBattleExecutionStarted(false);
          onError(errorMessage);
          return;
        }
      }
    };

    handlePreparationState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.preparation, state.isApproving, state.isBattling, isReadyForBattle, hasEnoughBalance, idrxBalance, startRedirectCountdown]); // Run when preparation, approval, or battle states change

  // SAFETY: If error exists in state, call onError callback
  useEffect(() => {
    if (state.error) {
      console.error('[BattlePreparation] Battle state error detected:', state.error);
      // Reset battle execution flag on error to allow retry
      setBattleExecutionStarted(false);
      onError(state.error);
    }
  }, [state.error, onError]);

  // When on-chain battle tx is confirmed and result available, THEN enter arena
  useEffect(() => {
    if (!state.battleResult || state.isBattling) return;

    console.log('[BattlePreparation] On-chain battle finished, transitioning to arena...', {
      won: state.battleResult.won,
      txHash: state.battleResult.txHash,
    });

    setCurrentStep('✅ Battle executed! Entering arena...');

    // Small delay for UX, then hand off to BattlePage/BattleArena
    setTimeout(() => {
      onReady(state.battleResult);
    }, 500);
  }, [state.battleResult, state.isBattling, onReady]);

  // Cleanup: Reset battle execution flag when component unmounts
  useEffect(() => {
    return () => {
      console.log('[BattlePreparation] Component unmounting, resetting battle execution flag');
      setBattleExecutionStarted(false);
    };
  }, []);

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

        {state.isApproving && (
          <div className={styles.detail}>
            <p>Please approve the IDRX transaction in your wallet.</p>
            <p className={styles.hint}>This allows the battle contract to charge {BATTLE_FEE_IDRX} IDRX battle fee.</p>
          </div>
        )}

        {state.isBattling && (
          <div className={styles.detail}>
            <p>Please confirm the battle transaction in your wallet.</p>
            <p className={styles.hint}>This will execute your battle on-chain and determine the outcome!</p>
          </div>
        )}

        {/* Show insufficient balance error - using wagmi balance for consistency */}
        {state.preparation && !hasEnoughBalance && (
          <div className={styles.error}>
            {idrxBalance === 0 ? (
              // No IDRX balance
              <>
                <p>⚠️ No IDRX balance detected</p>
                <p>You need at least {BATTLE_FEE_IDRX} IDRX to battle.</p>
                <p className={styles.hint}>Please get IDRX tokens from the shop or faucet.</p>
              </>
            ) : (
              // Has some IDRX but less than required
              <>
                <p>❌ Insufficient IDRX balance</p>
                <p>You have {formatIDRXBalance(idrxBalance)} IDRX but need at least {BATTLE_FEE_IDRX} IDRX.</p>
                <p className={styles.hint}>Please get more IDRX tokens from the shop or faucet.</p>
              </>
            )}
            {/* Countdown redirect notice */}
            {redirectCountdown !== null && (
              <p className={styles.redirectNotice}>
                🏠 Redirecting to home in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
              </p>
            )}
          </div>
        )}

        {/* Show battle requirements checklist when balance is sufficient */}
        {state.preparation && hasEnoughBalance && (
          <div className={styles.requirements}>
            <p className={styles.checklistTitle}>Battle Requirements:</p>
            <p className={styles.balanceInfo}>✅ IDRX Balance: {formatIDRXBalance(idrxBalance)} / {BATTLE_FEE_IDRX}.00 IDRX</p>
            <div className={styles.checklist}>
              <div className={state.preparation.needsApproval ? styles.pending : styles.completed}>
                {!state.preparation.needsApproval ? '✅' : '⏳'} IDRX Approval
                {state.preparation.needsApproval && (
                  <span className={styles.securityNote}> - Wallet confirmation required for security</span>
                )}
              </div>
              <div className={state.isBattling || state.battleResult ? styles.completed : styles.pending}>
                {state.battleResult ? '✅' : '⏳'} Battle Execution
                {!state.battleResult && (
                  <span className={styles.securityNote}> - Wallet confirmation required for on-chain transaction</span>
                )}
              </div>
            </div>
            <p className={styles.securityInfo}>
              🔒 Wallet confirmations are required by blockchain protocol to protect your assets
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
