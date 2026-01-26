/**
 * useBattle Hook
 * 
 * Custom hook for managing battle flow including:
 * - Battle preparation (proof generation, IDRX checks)
 * - IDRX approval
 * - Battle execution
 * - Post-battle processing
 * 
 * @module useBattle
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address } from 'viem';
import { 
  prepareBattle, 
  executeBattle,
  mintWinToken,
  type BattlePreparation,
} from '@/app/lib/blockchain/battleService';
import {
  IDRX_CONTRACT_ADDRESS,
  IDRX_CONTRACT_ABI,
  BATTLE_CONTRACT_ADDRESS,
  BATTLE_FEE_AMOUNT,
} from '@/app/lib/blockchain/contracts';

export interface BattleState {
  // Loading states
  isPreparing: boolean;
  isApproving: boolean;
  isMinting: boolean;
  isBattling: boolean;
  isProcessing: boolean;

  // Battle data
  preparation: BattlePreparation | null;

  // Results
  battleResult: {
    won: boolean;
    txHash: string;
  } | null;

  // Error handling
  error: string | null;
}

export interface UseBattleReturn {
  // State
  state: BattleState;

  // Actions
  prepare: (tokenId: number) => Promise<void>;
  approve: () => Promise<void>;
  mintWin: () => Promise<void>;
  battle: () => Promise<void>;
  markAsUsed: (tokenId: number) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for managing battle lifecycle
 * 
 * @returns Battle state and action functions
 * 
 * @example
 * const { state, prepare, approve, mintWin, battle } = useBattle();
 * 
 * // 1. Prepare battle
 * await prepare(tokenId);
 * 
 * // 2. Approve IDRX if needed
 * if (state.preparation?.needsApproval) {
 *   await approve();
 * }
 * 
 * // 3. Mint WIN token if not already minted
 * if (!state.preparation?.hasWinTokenMinted) {
 *   await mintWin();
 * }
 * 
 * // 4. Execute battle
 * await battle();
 */
export function useBattle(): UseBattleReturn {
  const { address } = useAccount();
  
  // Wagmi hooks for contract writes (properly handles chain via OnchainKit)
  const { 
    writeContract,
    data: approvalHash, 
    reset: resetWriteContract,
  } = useWriteContract();
  
  const { isSuccess: approvalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });
  
  const [state, setState] = useState<BattleState>({
    isPreparing: false,
    isApproving: false,
    isMinting: false,
    isBattling: false,
    isProcessing: false,
    preparation: null,
    battleResult: null,
    error: null,
  });

  /**
   * Prepare for battle
   * - Gets Merkle proof
   * - Checks IDRX balance and allowance
   * - Checks WIN token minting status
   */
  const prepare = useCallback(async (tokenId: number) => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isPreparing: true, error: null }));

    try {
      console.log('[useBattle] Preparing battle for token:', tokenId);
      const preparation = await prepareBattle(tokenId, address as Address);
      
      console.log('[useBattle] Battle prepared:', {
        hasEnoughIDRX: preparation.hasEnoughIDRX,
        needsApproval: preparation.needsApproval,
        stats: preparation.stats,
      });

      setState(prev => ({
        ...prev,
        preparation,
        isPreparing: false,
      }));

      // Validation checks
      if (!preparation.hasEnoughIDRX) {
        setState(prev => ({
          ...prev,
          error: 'Insufficient IDRX balance. You need at least 5 IDRX to battle.',
        }));
      }
    } catch (error) {
      console.error('[useBattle] Preparation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare battle';
      setState(prev => ({
        ...prev,
        isPreparing: false,
        error: errorMessage,
      }));
    }
  }, [address]);

  /**
   * Approve IDRX tokens for Battle Contract
   * Uses wagmi's writeContract which properly handles chain switching via OnchainKit
   */
  const approve = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isApproving: true, error: null }));

    try {
      console.log('[useBattle] Approving IDRX via wagmi...');
      
      // Use wagmi writeContract with explicit chainId for Base
      writeContract({
        address: IDRX_CONTRACT_ADDRESS as Address,
        abi: IDRX_CONTRACT_ABI,
        functionName: 'approve',
        args: [BATTLE_CONTRACT_ADDRESS as Address, BigInt(BATTLE_FEE_AMOUNT)],
        chainId: 8453, // Base chain ID - forces transaction on Base
      });

      // Wait for the transaction to be submitted
      // The actual waiting is handled by useWaitForTransactionReceipt
      console.log('[useBattle] Approval transaction submitted');
      
    } catch (error) {
      console.error('[useBattle] Approval error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Approval failed';
      setState(prev => ({
        ...prev,
        isApproving: false,
        error: errorMessage,
      }));
      resetWriteContract();
      throw error;
    }
  }, [address, writeContract, resetWriteContract]);
  
  // Handle approval success
  const handleApprovalSuccess = useCallback(() => {
    if (approvalSuccess && state.isApproving) {
      console.log('[useBattle] IDRX approval confirmed:', approvalHash);
      setState(prev => ({
        ...prev,
        isApproving: false,
        preparation: prev.preparation ? {
          ...prev.preparation,
          needsApproval: false,
        } : null,
      }));
      resetWriteContract();
    }
  }, [approvalSuccess, approvalHash, state.isApproving, resetWriteContract]);
  
  // Call handleApprovalSuccess when approval succeeds
  if (approvalSuccess && state.isApproving) {
    handleApprovalSuccess();
  }

  /**
   * Mint WIN token for battle
   * User must mint this BEFORE battle
   * Contract holds it and distributes only on win
   */
  const mintWin = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isMinting: true, error: null }));

    try {
      console.log('[useBattle] Minting WIN token...');
      
      const result = await mintWinToken(address as Address);
      
      if (!result.success) {
        throw new Error(result.error || 'WIN token minting failed');
      }

      console.log('[useBattle] WIN token minted successfully:', result.txHash);

      setState(prev => ({
        ...prev,
        isMinting: false,
        preparation: prev.preparation ? {
          ...prev.preparation,
          hasWinTokenMinted: true,
        } : null,
      }));
    } catch (error) {
      console.error('[useBattle] WIN token minting error:', error);
      const errorMessage = error instanceof Error ? error.message : 'WIN token minting failed';
      setState(prev => ({
        ...prev,
        isMinting: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [address]);

  /**
   * Execute battle on-chain
   */
  const battle = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    if (!state.preparation) {
      setState(prev => ({ ...prev, error: 'Battle not prepared' }));
      return;
    }

    setState(prev => ({ ...prev, isBattling: true, error: null }));

    try {
      const { tokenId, stats, proof } = state.preparation;

      console.log('[useBattle] Executing battle...', {
        tokenId,
        hp: stats.hp,
        attack: stats.attack,
        proofLength: proof.length,
      });

      const result = await executeBattle(
        tokenId,
        stats.hp,
        stats.attack,
        proof,
        address as Address
      );

      if (!result.success) {
        throw new Error(result.error || 'Battle failed');
      }

      console.log('[useBattle] Battle completed:', {
        won: result.won,
        txHash: result.txHash,
      });

      setState(prev => ({
        ...prev,
        isBattling: false,
        battleResult: {
          won: result.won,
          txHash: result.txHash,
        },
      }));
    } catch (error) {
      console.error('[useBattle] Battle error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Battle failed';
      setState(prev => ({
        ...prev,
        isBattling: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [address, state.preparation]);

  /**
   * Mark NFT as used in database after successful battle
   */
  const markAsUsed = useCallback(async (tokenId: number) => {
    if (!address) {
      console.error('[useBattle] No wallet address for marking NFT as used');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      console.log('[useBattle] Marking NFT as used:', tokenId);

      const response = await fetch('/api/cards/mark-used', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ tokenId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark NFT as used');
      }

      console.log('[useBattle] NFT marked as used successfully');
      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error) {
      console.error('[useBattle] Error marking NFT as used:', error);
      // Don't throw error here - this is non-critical for user experience
      // The contract already marked it as used, this is just UI sync
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [address]);

  /**
   * Reset battle state
   */
  const reset = useCallback(() => {
    setState({
      isPreparing: false,
      isApproving: false,
      isMinting: false,
      isBattling: false,
      isProcessing: false,
      preparation: null,
      battleResult: null,
      error: null,
    });
  }, []);

  return {
    state,
    prepare,
    approve,
    mintWin,
    battle,
    markAsUsed,
    reset,
  };
}
