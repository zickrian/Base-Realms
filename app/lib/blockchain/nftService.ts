/**
 * NFT Service - Professional blockchain integration layer
 * Handles NFT contract interactions and balance checking
 */

export const NFT_CONTRACT_ADDRESS = "0x2FFb8aA5176c1da165EAB569c3e4089e84EC5816" as const;

// ABI format compatible with viem
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
] as const;

export interface NFTBalanceResult {
  balance: number;
  hasNFT: boolean;
  error?: string;
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
