/**
 * Battle Service
 * 
 * Handles all battle-related blockchain interactions including:
 * - IDRX token approval
 * - Battle execution with Merkle proof
 * - Transaction status tracking
 * - Error handling and user-friendly messages
 * 
 * @module battleService
 */

import { createPublicClient, createWalletClient, custom, http, type Address, type Hash } from 'viem';
import { base } from 'viem/chains';
import {
  BATTLE_CONTRACT_ADDRESS,
  IDRX_CONTRACT_ADDRESS,
  BATTLE_CONTRACT_ABI,
  IDRX_CONTRACT_ABI,
  BATTLE_FEE_AMOUNT,
} from './contracts';
import { getProofForToken, type NFTStats } from './merkleService';

// ============================================================================
// TYPES
// ============================================================================

export interface BattlePreparation {
  tokenId: number;
  stats: NFTStats;
  proof: string[];
  hasEnoughIDRX: boolean;
  needsApproval: boolean;
  idrxBalance: string;
  currentAllowance: string;
}

export interface ApprovalResult {
  success: boolean;
  txHash?: Hash;
  error?: string;
}

export interface BattleResult {
  success: boolean;
  won: boolean;
  txHash: Hash;
  error?: string;
}

export interface BattleError {
  code: string;
  message: string;
  userMessage: string;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Parse contract errors into user-friendly messages
 */
function parseBattleError(error: unknown): BattleError {
  const errorStr = error instanceof Error ? error.message : String(error);

  // Check for common errors
  if (errorStr.includes('NFT already used') || errorStr.includes('hasUsed')) {
    return {
      code: 'ALREADY_USED',
      message: errorStr,
      userMessage: 'This NFT has already been used in battle and cannot be used again.',
    };
  }

  if (errorStr.includes('not the owner') || errorStr.includes('ownership')) {
    return {
      code: 'NOT_OWNER',
      message: errorStr,
      userMessage: 'You do not own this NFT.',
    };
  }

  if (errorStr.includes('Invalid proof') || errorStr.includes('merkle')) {
    return {
      code: 'INVALID_PROOF',
      message: errorStr,
      userMessage: 'Invalid battle stats. Please contact support.',
    };
  }

  if (errorStr.includes('insufficient') || errorStr.includes('balance')) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: errorStr,
      userMessage: 'Insufficient IDRX balance. You need at least 5 IDRX to battle.',
    };
  }

  if (errorStr.includes('User rejected') || errorStr.includes('user denied')) {
    return {
      code: 'USER_REJECTED',
      message: errorStr,
      userMessage: 'Transaction was rejected.',
    };
  }

  // Generic error
  return {
    code: 'UNKNOWN',
    message: errorStr,
    userMessage: 'Battle failed. Please try again.',
  };
}

// ============================================================================
// IDRX TOKEN OPERATIONS
// ============================================================================

/**
 * Check IDRX balance for a wallet
 * 
 * @param walletAddress - User's wallet address
 * @returns Balance in wei (as string)
 */
export async function checkIDRXBalance(walletAddress: Address): Promise<string> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const balance = await publicClient.readContract({
      address: IDRX_CONTRACT_ADDRESS as Address,
      abi: IDRX_CONTRACT_ABI,
      functionName: 'balanceOf',
      args: [walletAddress],
    });

    return balance.toString();
  } catch (error) {
    console.error('[BattleService] Error checking IDRX balance:', error);
    throw new Error('Failed to check IDRX balance');
  }
}

/**
 * Check current IDRX allowance for Battle Contract
 * 
 * @param walletAddress - User's wallet address
 * @returns Current allowance in wei (as string)
 */
export async function checkIDRXAllowance(walletAddress: Address): Promise<string> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const allowance = await publicClient.readContract({
      address: IDRX_CONTRACT_ADDRESS as Address,
      abi: IDRX_CONTRACT_ABI,
      functionName: 'allowance',
      args: [walletAddress, BATTLE_CONTRACT_ADDRESS as Address],
    });

    return allowance.toString();
  } catch (error) {
    console.error('[BattleService] Error checking IDRX allowance:', error);
    throw new Error('Failed to check IDRX allowance');
  }
}

/**
 * Approve Battle Contract to spend IDRX tokens
 * 
 * @param walletAddress - User's wallet address
 * @param amount - Amount to approve (defaults to battle fee)
 * @returns Approval result with transaction hash
 */
export async function approveIDRX(
  walletAddress: Address,
  amount: string = BATTLE_FEE_AMOUNT
): Promise<ApprovalResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'Wallet not connected',
      };
    }

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });

    const txHash = await walletClient.writeContract({
      address: IDRX_CONTRACT_ADDRESS as Address,
      abi: IDRX_CONTRACT_ABI,
      functionName: 'approve',
      args: [BATTLE_CONTRACT_ADDRESS as Address, BigInt(amount)],
      account: walletAddress,
    });

    // Wait for transaction confirmation
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('[BattleService] Approval error:', error);
    const parsedError = parseBattleError(error);
    return {
      success: false,
      error: parsedError.userMessage,
    };
  }
}

// ============================================================================
// BATTLE PREPARATION
// ============================================================================

/**
 * Prepare for battle by checking all requirements
 * 
 * This function:
 * 1. Gets Merkle proof for the token
 * 2. Checks IDRX balance
 * 3. Checks approval status
 * 
 * @param tokenId - NFT token ID
 * @param walletAddress - User's wallet address
 * @returns Battle preparation data
 */
export async function prepareBattle(
  tokenId: number,
  walletAddress: Address
): Promise<BattlePreparation> {
  try {
    // Get Merkle proof and stats
    const { proof, stats } = getProofForToken(tokenId);

    // Check IDRX balance
    const balance = await checkIDRXBalance(walletAddress);
    const hasEnoughIDRX = BigInt(balance) >= BigInt(BATTLE_FEE_AMOUNT);

    // Check allowance
    const allowance = await checkIDRXAllowance(walletAddress);
    const needsApproval = BigInt(allowance) < BigInt(BATTLE_FEE_AMOUNT);

    return {
      tokenId,
      stats,
      proof,
      hasEnoughIDRX,
      needsApproval,
      idrxBalance: balance,
      currentAllowance: allowance,
    };
  } catch (error) {
    console.error('[BattleService] Error preparing battle:', error);
    throw error;
  }
}

// ============================================================================
// BATTLE EXECUTION
// ============================================================================

/**
 * Execute battle on-chain
 * 
 * This calls the Battle Contract with:
 * - tokenId: NFT ID to battle with
 * - hp: HP value from stats.json
 * - attack: Attack value from stats.json
 * - proof: Merkle proof array
 * 
 * The contract will:
 * 1. Verify ownership
 * 2. Verify NFT not used before
 * 3. Verify Merkle proof
 * 4. Transfer 5 IDRX from user
 * 5. Run battle simulation
 * 6. Mint WinToken if won
 * 7. Mark NFT as used forever
 * 
 * @param tokenId - NFT token ID
 * @param hp - HP value (from stats.json)
 * @param attack - Attack value (from stats.json)
 * @param proof - Merkle proof array
 * @param walletAddress - User's wallet address
 * @returns Battle result with win/loss status
 */
export async function executeBattle(
  tokenId: number,
  hp: number,
  attack: number,
  proof: string[],
  walletAddress: Address
): Promise<BattleResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Wallet not connected');
    }

    console.log('[BattleService] Executing battle with:', {
      tokenId,
      hp,
      attack,
      proofLength: proof.length,
    });

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });

    // Call battle function
    const txHash = await walletClient.writeContract({
      address: BATTLE_CONTRACT_ADDRESS as Address,
      abi: BATTLE_CONTRACT_ABI,
      functionName: 'battle',
      args: [BigInt(tokenId), BigInt(hp), BigInt(attack), proof as `0x${string}`[]],
      account: walletAddress,
    });

    console.log('[BattleService] Battle transaction sent:', txHash);

    // Wait for transaction confirmation
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log('[BattleService] Battle transaction confirmed:', receipt);

    // Parse logs to determine win/loss
    // Look for BattleCompleted event
    let won = false;
    if (receipt.logs && receipt.logs.length > 0) {
      // Find BattleCompleted event (topic0 matches event signature)
      const battleEvent = receipt.logs.find((log) => {
        // BattleCompleted(address indexed player, uint256 indexed tokenId, bool won)
        return log.topics[0] === '0x...' || log.address === BATTLE_CONTRACT_ADDRESS;
      });

      if (battleEvent && battleEvent.data) {
        // Parse the 'won' boolean from event data
        // Last 32 bytes = won (bool)
        won = battleEvent.data.slice(-1) === '1';
      }
    }

    return {
      success: true,
      won,
      txHash,
    };
  } catch (error) {
    console.error('[BattleService] Battle execution error:', error);
    const parsedError = parseBattleError(error);
    return {
      success: false,
      won: false,
      txHash: '0x' as Hash,
      error: parsedError.userMessage,
    };
  }
}

/**
 * Check if an NFT has been used in battle (on-chain check)
 * 
 * @param tokenId - NFT token ID
 * @returns true if used, false if available
 */
export async function hasNFTBeenUsed(tokenId: number): Promise<boolean> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const used = await publicClient.readContract({
      address: BATTLE_CONTRACT_ADDRESS as Address,
      abi: BATTLE_CONTRACT_ABI,
      functionName: 'hasUsed',
      args: [BigInt(tokenId)],
    });

    return used as boolean;
  } catch (error) {
    console.error('[BattleService] Error checking NFT used status:', error);
    return false;
  }
}
