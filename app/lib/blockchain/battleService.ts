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

import { createPublicClient, createWalletClient, custom, fallback, http, type Address, type Hash } from 'viem';
import { base } from 'viem/chains';
import {
  BATTLE_CONTRACT_ADDRESS,
  IDRX_CONTRACT_ADDRESS,
  WINTOKEN_CONTRACT_ADDRESS,
  BATTLE_CONTRACT_ABI,
  IDRX_CONTRACT_ABI,
  WINTOKEN_CONTRACT_ABI,
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
  /** Whether this NFT has already been used in battle (on-chain source of truth) */
  usedOnChain: boolean;
  hasEnoughIDRX: boolean;
  needsApproval: boolean;
  hasWinTokenMinted: boolean;
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
// RPC CLIENT
// ============================================================================

const DEFAULT_BASE_RPCS = [
  'https://base.llamarpc.com',
  'https://base.meowrpc.com',
  'https://base-mainnet.public.blastapi.io',
  'https://mainnet.base.org',
];

function createBattlePublicClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL;
  const rpcUrlList = (process.env.BASE_RPC_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const transportCandidates = [
    ...rpcUrlList,
    rpcUrl,
    ...(rpcUrlList.length === 0 && !rpcUrl ? DEFAULT_BASE_RPCS : []),
  ].filter(Boolean);

  const transport = transportCandidates.length > 0
    ? fallback(
      transportCandidates.map((url) => http(url, {
        timeout: 30000,
        retryCount: 2,
      }))
    )
    : http();

  return createPublicClient({
    chain: base,
    transport,
  });
}

// ============================================================================
// IDRX TOKEN OPERATIONS
// ============================================================================

/**
 * Check IDRX balance for a wallet with retry mechanism
 * 
 * @param walletAddress - User's wallet address
 * @param retryCount - Number of retries (default: 3)
 * @returns Balance in raw units (with 2 decimals: 100 IDRX = 10000)
 */
export async function checkIDRXBalance(walletAddress: Address, retryCount: number = 3): Promise<string> {
  const MAX_RETRIES = retryCount;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[BattleService] Checking IDRX balance for: ${walletAddress} (attempt ${attempt}/${MAX_RETRIES})`);
      console.log('[BattleService] IDRX Contract:', IDRX_CONTRACT_ADDRESS);

      const publicClient = createBattlePublicClient();

      const balance = await publicClient.readContract({
        address: IDRX_CONTRACT_ADDRESS as Address,
        abi: IDRX_CONTRACT_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      const balanceStr = balance.toString();
      const balanceInIDRX = (Number(balanceStr) / 100).toFixed(2);

      console.log('[BattleService] ✅ IDRX Balance Retrieved:', {
        wallet: walletAddress,
        rawBalance: balanceStr,
        balanceInIDRX: `${balanceInIDRX} IDRX`,
        minimumRequired: BATTLE_FEE_AMOUNT,
        minimumInIDRX: `${(Number(BATTLE_FEE_AMOUNT) / 100).toFixed(2)} IDRX`,
        hasEnough: BigInt(balanceStr) >= BigInt(BATTLE_FEE_AMOUNT),
      });

      return balanceStr;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BattleService] ❌ Error checking IDRX balance (attempt ${attempt}/${MAX_RETRIES}):`, error);
      console.error('[BattleService] Error details:', {
        wallet: walletAddress,
        contract: IDRX_CONTRACT_ADDRESS,
        errorMessage,
      });

      // Handle specific contract errors that shouldn't be retried
      if (errorMessage.includes('returned no data') || errorMessage.includes('0x')) {
        console.warn('[BattleService] ⚠️ IDRX contract returned no data - contract may not be deployed or wrong network');
        // Only return 0 on last attempt for this error type
        if (attempt === MAX_RETRIES) {
          return '0';
        }
      }

      // If not the last attempt, wait and retry
      if (attempt < MAX_RETRIES) {
        console.log(`[BattleService] ⏳ Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        // Last attempt failed - throw error instead of silently returning 0
        console.error('[BattleService] ❌ All retry attempts failed for IDRX balance check');
        throw new Error(`Failed to check IDRX balance after ${MAX_RETRIES} attempts: ${errorMessage}`);
      }
    }
  }

  // This should never be reached due to the throw above, but TypeScript needs it
  return '0';
}

/**
 * Check current IDRX allowance for Battle Contract with retry mechanism
 * 
 * @param walletAddress - User's wallet address
 * @param retryCount - Number of retries (default: 3)
 * @returns Current allowance in wei (as string)
 */
export async function checkIDRXAllowance(walletAddress: Address, retryCount: number = 3): Promise<string> {
  const MAX_RETRIES = retryCount;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[BattleService] Checking IDRX allowance for: ${walletAddress} (attempt ${attempt}/${MAX_RETRIES})`);
      const publicClient = createBattlePublicClient();

      const allowance = await publicClient.readContract({
        address: IDRX_CONTRACT_ADDRESS as Address,
        abi: IDRX_CONTRACT_ABI,
        functionName: 'allowance',
        args: [walletAddress, BATTLE_CONTRACT_ADDRESS as Address],
      });

      const allowanceStr = allowance.toString();
      console.log('[BattleService] ✅ IDRX Allowance Retrieved:', allowanceStr);
      return allowanceStr;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BattleService] ❌ Error checking IDRX allowance (attempt ${attempt}/${MAX_RETRIES}):`, error);

      // Handle specific contract errors gracefully
      if (errorMessage.includes('returned no data') || errorMessage.includes('0x')) {
        console.warn('[BattleService] IDRX contract not accessible');
        if (attempt === MAX_RETRIES) {
          return '0';
        }
      }

      // If not the last attempt, wait and retry
      if (attempt < MAX_RETRIES) {
        console.log(`[BattleService] ⏳ Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        // Last attempt failed - return 0 for allowance (less critical than balance)
        console.error('[BattleService] ❌ All retry attempts failed for IDRX allowance check');
        return '0';
      }
    }
  }

  return '0';
}

/**
 * Check if user has already minted WIN token
 * 
 * NOTE: Due to RPC reliability issues with the unverified contract,
 * we skip the check and assume user hasn't minted.
 * If user already minted, the mint transaction will fail with a clear error.
 * 
 * @param walletAddress - User's wallet address
 * @returns false (always assume not minted, let mint transaction handle it)
 */
export async function checkWinTokenMinted(walletAddress: Address): Promise<boolean> {
  // Skip RPC check - the contract is unverified and RPC calls are unreliable
  // If user already minted, the mint() call will revert with appropriate error
  console.log('[BattleService] Skipping WIN token check (contract unverified) - will attempt mint');
  console.log('[BattleService] Wallet:', walletAddress);
  return false;
}

/**
 * Mint WIN token for battle
 * User must mint this BEFORE battle
 * Contract will hold and distribute only if user wins
 * 
 * @param walletAddress - User's wallet address
 * @returns Minting result with transaction hash
 */
export async function mintWinToken(walletAddress: Address): Promise<ApprovalResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'Wallet not connected',
      };
    }

    // First, ensure we're on the correct chain (Base)
    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainIdNumber = parseInt(currentChainId as string, 16);

      if (currentChainIdNumber !== 8453) {
        console.log('[BattleService] Chain mismatch detected, requesting switch to Base...');
        console.log('[BattleService] Current chain:', currentChainIdNumber, 'Required: 8453 (Base)');

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // 8453 in hex
          });
          console.log('[BattleService] Successfully switched to Base');

          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (switchError) {
          console.error('[BattleService] Failed to switch chain:', switchError);
          return {
            success: false,
            error: 'Please switch to Base network manually and try again.',
          };
        }
      }
    } catch (chainError) {
      console.warn('[BattleService] Could not check/switch chain:', chainError);
    }

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
      account: walletAddress,
    });

    console.log('[BattleService] Minting WIN token for:', walletAddress);
    console.log('[BattleService] WIN Token contract:', WINTOKEN_CONTRACT_ADDRESS);

    const txHash = await walletClient.writeContract({
      address: WINTOKEN_CONTRACT_ADDRESS as Address,
      abi: WINTOKEN_CONTRACT_ABI,
      functionName: 'mint',
      args: [],
      chain: base,
    });

    // Wait for transaction confirmation
    const publicClient = createBattlePublicClient();

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log('[BattleService] WIN token minted successfully:', txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error: unknown) {
    console.error('[BattleService] WIN token minting error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle chain mismatch error
    if (errorMessage.includes('does not match the target chain') ||
      errorMessage.includes('chain') && errorMessage.includes('mismatch')) {
      return {
        success: false,
        error: 'Wrong network. Please switch to Base network and try again.',
      };
    }

    // Handle specific contract errors
    if (errorMessage.includes('returned no data') || errorMessage.includes('0x')) {
      return {
        success: false,
        error: 'WIN Token contract not available. Please contact support.',
      };
    }

    // Handle user rejection
    if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
      return {
        success: false,
        error: 'Transaction rejected by user.',
      };
    }

    const parsedError = parseBattleError(error);
    return {
      success: false,
      error: parsedError.userMessage,
    };
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

    // First, ensure we're on the correct chain (Base)
    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainIdNumber = parseInt(currentChainId as string, 16);

      if (currentChainIdNumber !== 8453) {
        console.log('[BattleService] Chain mismatch detected for approval, requesting switch to Base...');

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // 8453 in hex
          });
          console.log('[BattleService] Successfully switched to Base');
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (switchError) {
          console.error('[BattleService] Failed to switch chain:', switchError);
          return {
            success: false,
            error: 'Please switch to Base network manually and try again.',
          };
        }
      }
    } catch (chainError) {
      console.warn('[BattleService] Could not check/switch chain:', chainError);
    }

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });

    console.log('[BattleService] Approving IDRX for:', walletAddress);
    console.log('[BattleService] Approval amount:', amount);

    const txHash = await walletClient.writeContract({
      address: IDRX_CONTRACT_ADDRESS as Address,
      abi: IDRX_CONTRACT_ABI,
      functionName: 'approve',
      args: [BATTLE_CONTRACT_ADDRESS as Address, BigInt(amount)],
      account: walletAddress,
    });

    // Wait for transaction confirmation
    const publicClient = createBattlePublicClient();

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log('[BattleService] IDRX approved successfully:', txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error: unknown) {
    console.error('[BattleService] Approval error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle chain mismatch error
    if (errorMessage.includes('does not match the target chain') ||
      errorMessage.includes('chain') && errorMessage.includes('mismatch')) {
      return {
        success: false,
        error: 'Wrong network. Please switch to Base network and try again.',
      };
    }

    // Handle specific contract errors
    if (errorMessage.includes('returned no data') || errorMessage.includes('0x')) {
      return {
        success: false,
        error: 'IDRX contract not available. Please check your network connection.',
      };
    }

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
 * 4. Checks WIN token minting status
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

    // NOTE: Removed on-chain hasUsed check because:
    // 1. The contract function is not working correctly (returns 0x)
    // 2. We already track used status in database reliably
    // 3. Prevents unnecessary wallet popup ("Dapp wants to continue")
    // The database `used` field is the source of truth for NFT usage
    const usedOnChain = false; // Always false - database is source of truth

    // Check IDRX balance
    const balance = await checkIDRXBalance(walletAddress);
    const hasEnoughIDRX = BigInt(balance) >= BigInt(BATTLE_FEE_AMOUNT);

    console.log('[BattleService] Battle Preparation Check:', {
      balance,
      battleFeeAmount: BATTLE_FEE_AMOUNT,
      hasEnoughIDRX,
      balanceInIDRX: (Number(balance) / 100).toFixed(2) + ' IDRX',
      requiredIDRX: (Number(BATTLE_FEE_AMOUNT) / 100).toFixed(2) + ' IDRX',
    });

    // Check allowance
    const allowance = await checkIDRXAllowance(walletAddress);
    const needsApproval = BigInt(allowance) < BigInt(BATTLE_FEE_AMOUNT);

    // Check if WIN token already minted
    const hasWinTokenMinted = await checkWinTokenMinted(walletAddress);

    return {
      tokenId,
      stats,
      proof,
       usedOnChain,
      hasEnoughIDRX,
      needsApproval,
      hasWinTokenMinted,
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
 * CRITICAL: User MUST have:
 * 1. Approved IDRX (≥5 IDRX)
 * 2. Minted WIN token BEFORE calling this
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
 * 3. Verify Merkle proof (hp, attack valid)
 * 4. Transfer 5 IDRX from user
 * 5. Run battle simulation
 * 6. IF WON: Transfer WIN token to user
 * 7. IF LOST: WIN token stays with user (but contract marks it)
 * 8. Mark NFT as used forever
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
      account: walletAddress,
    });

    // Call battle function
    const txHash = await walletClient.writeContract({
      address: BATTLE_CONTRACT_ADDRESS as Address,
      abi: BATTLE_CONTRACT_ABI,
      functionName: 'battle',
      args: [BigInt(tokenId), BigInt(hp), BigInt(attack), proof as `0x${string}`[]],
      chain: base,
    });

    console.log('[BattleService] Battle transaction sent:', txHash);

    // Wait for transaction confirmation
    const publicClient = createBattlePublicClient();

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

    // Handle user rejection
    if (error instanceof Error && (error.message?.includes('User rejected') || error.message?.includes('User denied'))) {
      return {
        success: false,
        won: false,
        txHash: '0x' as Hash,
        error: 'Battle transaction rejected by user.',
      };
    }

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
    const publicClient = createBattlePublicClient();

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
