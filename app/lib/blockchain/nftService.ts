/**
 * NFT Service - Professional blockchain integration layer
 * Handles NFT contract interactions and balance checking
 */

// Contract addresses for each rarity
export const NFT_CONTRACTS = {
  common: "0x2ffb8aa5176c1da165eab569c3e4089e84ec5816" as const,
  rare: "0x38826ec522f130354652bc16284645b0c832c341" as const,
  epic: "0xcA36Cf2e444C209209F0c62127fAA37ae1bE62C9" as const,
  legendary: "0xe199DeC5DdE8007a17BED43f1723bea41Ba5dADd" as const,
} as const;

export const NFT_CONTRACT_ADDRESS = NFT_CONTRACTS.common;

// Back card image - SAME for all rarities (shown before flip)
export const BACK_CARD_IMAGE = "https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/backcards.png" as const;

// Front card images for each rarity (shown after flip)
export const FRONT_CARD_IMAGES = {
  common: "https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/commoncards.png",
  rare: "https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/rarecards.png",
  epic: "https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/epiccards.png",
  legendary: "https://htdiytcpgyawxzpitlll.supabase.co/storage/v1/object/public/assets/game/icons/legendcards.png",
} as const;

// ABI format compatible with viem - including mint function
export const NFT_CONTRACT_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
] as const;

// Viem-compatible ABI (for server-side use)
export const NFT_CONTRACT_ABI_VIEM = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" }
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "to", type: "address" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface NFTBalanceResult {
  balance: number;
  hasNFT: boolean;
  error?: string;
}

export interface MintResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Get contract address for specific rarity
 */
export function getContractAddress(rarity: Rarity): string {
  return NFT_CONTRACTS[rarity];
}

/**
 * Get back card image - ALWAYS the same regardless of rarity
 */
export function getBackCardImage(): string {
  return BACK_CARD_IMAGE;
}

/**
 * Get front card image based on rarity (shown after flip)
 */
export function getFrontCardImage(rarity: Rarity): string {
  return FRONT_CARD_IMAGES[rarity];
}

/**
 * Check if user owns NFT from specific contract address
 * This is a client-side check using window.ethereum
 */
export async function checkNFTOwnership(
  walletAddress: string,
  contractAddress: string
): Promise<NFTBalanceResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        balance: 0,
        hasNFT: false,
        error: 'Wallet not connected'
      };
    }

    // Use viem for reading (if available on client)
    const { createPublicClient, http } = await import('viem');
    const { base } = await import('viem/chains');

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const balance = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: NFT_CONTRACT_ABI_VIEM,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });

    return {
      balance: Number(balance),
      hasNFT: Number(balance) > 0,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to check NFT ownership';
    return {
      balance: 0,
      hasNFT: false,
      error: errorMessage
    };
  }
}

/**
 * Mint NFT card using connected wallet
 * This must be called from client-side with user's wallet connected
 * Note: Chain switching should be handled at component level using wagmi hooks
 */
export async function mintNFTCard(
  contractAddress: string,
  walletAddress: string
): Promise<MintResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'Wallet not connected. Please connect your wallet first.'
      };
    }

    const BASE_CHAIN_ID = 8453;

    // Verify we're on Base network before minting
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainIdHex as string, 16);
    
    if (currentChainId !== BASE_CHAIN_ID) {
      return {
        success: false,
        error: `Wallet is on chain ${currentChainId}, but Base network (${BASE_CHAIN_ID}) is required. Please switch to Base network in your wallet.`
      };
    }

    // Use viem with wallet connected through wagmi/OnchainKit
    // The wallet should already be on Base network (verified above)
    const { createWalletClient, custom } = await import('viem');
    const { base } = await import('viem/chains');

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });

    // Call mint function on the contract
    const hash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: NFT_CONTRACT_ABI_VIEM,
      functionName: 'mint',
      args: [walletAddress as `0x${string}`],
      account: walletAddress as `0x${string}`,
    });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error: unknown) {
    console.error('Minting error:', error);
    
    // Check for specific chain mismatch error
    if (error instanceof Error) {
      if (error.message.includes('chain') && error.message.includes('does not match')) {
        return {
          success: false,
          error: 'Please switch to Base network (Chain ID: 8453) in your wallet and try again.'
        };
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT card';
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Check NFT balance from blockchain (server-side)
 * This should be called from API routes, not directly from client
 */
export async function checkNFTBalance(
  _walletAddress: string,
  _rpcUrl?: string
): Promise<NFTBalanceResult> {
  try {
    return {
      balance: 0,
      hasNFT: false,
      error: 'Blockchain RPC call not implemented - use client-side hook for now'
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to check NFT balance';
    return {
      balance: 0,
      hasNFT: false,
      error: errorMessage
    };
  }
}

/**
 * Get NFT token IDs owned by wallet
 */
export async function getOwnedTokenIds(
  _walletAddress: string,
  _balance: number,
  _rpcUrl?: string
): Promise<number[]> {
  try {
    return [];
  } catch (error: unknown) {
    console.error('Error getting token IDs:', error);
    return [];
  }
}
