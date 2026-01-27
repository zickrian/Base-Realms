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

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address } from 'viem';
import {
  prepareBattle,
  type BattlePreparation,
} from '@/app/lib/blockchain/battleService';
import {
  IDRX_CONTRACT_ADDRESS,
  IDRX_CONTRACT_ABI,
  BATTLE_CONTRACT_ADDRESS,
  BATTLE_CONTRACT_ABI,
  WINTOKEN_CONTRACT_ADDRESS,
  WINTOKEN_CONTRACT_ABI,
} from '@/app/lib/blockchain/contracts';

// Approve "unlimited" IDRX once to avoid insufficient allowance
// NOTE: We use BigInt(string) to avoid BigInt literal syntax, which
// is not supported when the TS target is lower than ES2020.
const MAX_UINT256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

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
  markAsUsed: (tokenId: number, battleTxHash?: string) => Promise<void>;
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

  // Wagmi hooks for IDRX approval (properly handles chain via OnchainKit)
  const {
    writeContract: writeApproval,
    data: approvalHash,
    reset: resetApprovalContract,
    isPending: _isApprovalPending,
  } = useWriteContract();

  const { isSuccess: approvalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // Wagmi hooks for WIN token minting (properly handles chain via OnchainKit)
  const {
    writeContract: writeMint,
    data: mintHash,
    reset: _resetMintContract,
    isPending: _isMintPending,
  } = useWriteContract();

  const { isSuccess: mintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Wagmi hooks for battle execution (properly handles chain via OnchainKit)
  const {
    writeContract: writeBattle,
    data: battleHash,
    reset: resetBattleContract,
    isPending: _isBattlePending,
  } = useWriteContract();

  const { 
    isSuccess: battleSuccess,
    data: battleReceipt 
  } = useWaitForTransactionReceipt({
    hash: battleHash,
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

      // Log validation status (don't set error here - let BattlePreparation handle it with more context)
      if (!preparation.hasEnoughIDRX) {
        console.warn('[useBattle] Insufficient IDRX or balance check issue:', {
          balance: preparation.idrxBalance,
          balanceInIDRX: (Number(preparation.idrxBalance) / 100).toFixed(2),
          hasEnoughIDRX: preparation.hasEnoughIDRX,
        });
        // Don't set error here - BattlePreparation will handle it with proper UI feedback
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

    // GUARD: Prevent duplicate approval calls while one is pending
    if (state.isApproving || _isApprovalPending) {
      console.log('[useBattle] Approval already in progress, skipping duplicate call');
      return;
    }

    setState(prev => ({ ...prev, isApproving: true, error: null }));

    try {
      console.log('[useBattle] Approving IDRX via wagmi (max allowance)...');

      // Use wagmi writeContract - OnchainKitProvider already set to Base chain
      // No need for explicit chainId as it may trigger unnecessary chain checks
      // We approve MAX_UINT256 so user tidak bolak-balik approve untuk setiap battle
      writeApproval({
        address: IDRX_CONTRACT_ADDRESS as Address,
        abi: IDRX_CONTRACT_ABI,
        functionName: 'approve',
        args: [BATTLE_CONTRACT_ADDRESS as Address, MAX_UINT256],
      });

      // Wait for the transaction to be submitted
      // The actual waiting is handled by useWaitForTransactionReceipt
      console.log('[useBattle] Approval transaction submitted');

    } catch (error) {
      console.error('[useBattle] Approval error:', error);
      
      // Check if user rejected/cancelled the transaction
      const errorMessage = error instanceof Error ? error.message : 'Approval failed';
      const isUserRejection = errorMessage.toLowerCase().includes('user rejected') || 
                              errorMessage.toLowerCase().includes('user denied') ||
                              errorMessage.toLowerCase().includes('user cancelled');
      
      setState(prev => ({
        ...prev,
        isApproving: false,
        error: isUserRejection ? 'TRANSACTION_CANCELLED' : errorMessage,
      }));
      resetApprovalContract();
      throw error;
    }
  }, [address, writeApproval, resetApprovalContract, state.isApproving, _isApprovalPending]);

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
      resetApprovalContract();
    }
  }, [approvalSuccess, approvalHash, state.isApproving, resetApprovalContract]);

  // Call handleApprovalSuccess when approval succeeds
  useEffect(() => {
    if (approvalSuccess && state.isApproving) {
      handleApprovalSuccess();
    }
  }, [approvalSuccess, state.isApproving, handleApprovalSuccess]);

  /**
   * Mint WIN token for battle
   * User must mint this BEFORE battle
   * Uses wagmi's writeContract which properly handles chain via OnchainKit
   */
  const mintWin = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    // GUARD: Prevent duplicate mint calls while one is pending
    if (state.isMinting || _isMintPending) {
      console.log('[useBattle] WIN token minting already in progress, skipping duplicate call');
      return;
    }

    setState(prev => ({ ...prev, isMinting: true, error: null }));

    try {
      console.log('[useBattle] Minting WIN token via wagmi...');
      console.log('[useBattle] WIN Token contract:', WINTOKEN_CONTRACT_ADDRESS);

      // Use wagmi writeMint - OnchainKitProvider already set to Base chain
      // No need for explicit chainId as it may trigger unnecessary chain checks
      writeMint({
        address: WINTOKEN_CONTRACT_ADDRESS as Address,
        abi: WINTOKEN_CONTRACT_ABI,
        functionName: 'mint',
        args: [],
      });

      console.log('[useBattle] WIN token mint transaction submitted');

    } catch (error) {
      console.error('[useBattle] WIN token minting error:', error);
      
      // Check if user rejected/cancelled the transaction
      const errorMessage = error instanceof Error ? error.message : 'WIN token minting failed';
      const isUserRejection = errorMessage.toLowerCase().includes('user rejected') || 
                              errorMessage.toLowerCase().includes('user denied') ||
                              errorMessage.toLowerCase().includes('user cancelled');
      
      setState(prev => ({
        ...prev,
        isMinting: false,
        error: isUserRejection ? 'TRANSACTION_CANCELLED' : errorMessage,
      }));
      throw error;
    }
  }, [address, writeMint, state.isMinting, _isMintPending]);

  // Handle mint success
  const handleMintSuccess = useCallback(() => {
    console.log('[useBattle] WIN token minted successfully:', mintHash);
    setState(prev => ({
      ...prev,
      isMinting: false,
      preparation: prev.preparation ? {
        ...prev.preparation,
        hasWinTokenMinted: true,
      } : null,
    }));
  }, [mintHash]);

  // Call handleMintSuccess when mint succeeds
  useEffect(() => {
    if (mintSuccess && state.isMinting) {
      handleMintSuccess();
    }
  }, [mintSuccess, state.isMinting, handleMintSuccess]);

  /**
   * Parse battle result from transaction receipt
   * The battle contract returns bool directly, and also emits BattleCompleted event
   */
  const parseBattleResult = useCallback((receipt: { logs?: Array<{ address?: string; data?: string }> }): boolean => {
    try {
      // The contract function returns bool, so check the receipt logs
      // BattleCompleted event: event BattleCompleted(address indexed player, uint256 indexed tokenId, bool won)
      if (!receipt?.logs || receipt.logs.length === 0) {
        console.warn('[useBattle] No logs in battle receipt, defaulting to loss');
        return false;
      }

      // Find BattleCompleted event from Battle Contract
      const battleEvent = receipt.logs.find((log: { address?: string; data?: string }) => 
        log.address && log.address.toLowerCase() === BATTLE_CONTRACT_ADDRESS.toLowerCase()
      );

      if (!battleEvent) {
        console.warn('[useBattle] BattleCompleted event not found, defaulting to loss');
        return false;
      }

      // The 'won' parameter is the 3rd parameter (not indexed), so it's in data
      // Data format: 0x0000000000000000000000000000000000000000000000000000000000000001 (true)
      //           or 0x0000000000000000000000000000000000000000000000000000000000000000 (false)
      if (battleEvent.data) {
        const won = battleEvent.data !== '0x0000000000000000000000000000000000000000000000000000000000000000';
        console.log('[useBattle] Battle result parsed from event:', won ? 'WON' : 'LOST');
        return won;
      }

      return false;
    } catch (error) {
      console.error('[useBattle] Error parsing battle result:', error);
      return false; // Default to loss on error
    }
  }, []);

  /**
   * Handle battle success - parse result and update state
   */
  const handleBattleSuccess = useCallback(() => {
    if (battleSuccess && battleReceipt && state.isBattling) {
      console.log('[useBattle] Battle transaction confirmed');
      
      // Parse battle result from receipt
      const won = parseBattleResult(battleReceipt);
      
      console.log('[useBattle] Battle completed:', {
        won,
        txHash: battleHash,
      });

      setState(prev => ({
        ...prev,
        isBattling: false,
        battleResult: {
          won,
          txHash: battleHash as string,
        },
      }));
      
      resetBattleContract();
    }
  }, [battleSuccess, battleReceipt, battleHash, state.isBattling, parseBattleResult, resetBattleContract]);

  // Call handleBattleSuccess when battle succeeds
  useEffect(() => {
    if (battleSuccess && state.isBattling) {
      handleBattleSuccess();
    }
  }, [battleSuccess, state.isBattling, handleBattleSuccess]);

  /**
   * Execute battle on-chain using wagmi/OnchainKit
   * Consistent with approve and mintWin operations
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

    // GUARD: Prevent duplicate battle execution while one is pending
    if (state.isBattling || _isBattlePending) {
      console.log('[useBattle] Battle execution already in progress, skipping duplicate call');
      return;
    }

    setState(prev => ({ ...prev, isBattling: true, error: null }));

    try {
      const { tokenId, stats, proof } = state.preparation;

      console.log('[useBattle] Executing battle via wagmi...', {
        tokenId,
        hp: stats.hp,
        attack: stats.attack,
        proofLength: proof.length,
      });

      // Use wagmi writeContract - OnchainKitProvider already set to Base chain
      // No need for explicit chainId as it may trigger unnecessary chain checks
      writeBattle({
        address: BATTLE_CONTRACT_ADDRESS as Address,
        abi: BATTLE_CONTRACT_ABI,
        functionName: 'battle',
        args: [BigInt(tokenId), BigInt(stats.hp), BigInt(stats.attack), proof as `0x${string}`[]],
      });

      console.log('[useBattle] Battle transaction submitted');

    } catch (error) {
      console.error('[useBattle] Battle error:', error);
      
      // Check if user rejected/cancelled the transaction
      const errorMessage = error instanceof Error ? error.message : 'Battle failed';
      const isUserRejection = errorMessage.toLowerCase().includes('user rejected') || 
                              errorMessage.toLowerCase().includes('user denied') ||
                              errorMessage.toLowerCase().includes('user cancelled');
      
      setState(prev => ({
        ...prev,
        isBattling: false,
        error: isUserRejection ? 'TRANSACTION_CANCELLED' : errorMessage,
      }));
      resetBattleContract();
      throw error;
    }
  }, [address, state.preparation, state.isBattling, _isBattlePending, writeBattle, resetBattleContract]);

  /**
   * Mark NFT as used in database after successful battle
   * PHASE 0 ENHANCEMENT: Pass battle tx hash for better tracking
   */
  const markAsUsed = useCallback(async (tokenId: number, battleTxHash?: string) => {
    if (!address) {
      console.error('[useBattle] No wallet address for marking NFT as used');
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      console.log('[useBattle] Marking NFT as used:', { 
        tokenId, 
        battleTxHash,
        address,
      });

      const response = await fetch('/api/cards/mark-used', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ tokenId, battleTxHash }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark NFT as used');
      }

      const result = await response.json();
      console.log('[useBattle] NFT marked as used successfully:', result);
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
    resetApprovalContract();
    resetBattleContract();
  }, [resetApprovalContract, resetBattleContract]);

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
