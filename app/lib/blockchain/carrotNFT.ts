/**
 * Carrot NFT Service - ERC-1155
 * Handles carrot NFT minting using ERC-1155 standard
 * Uses wagmi/viem ONLY (no ethers.js)
 */

// Carrot NFT Contract Address (ERC-1155)
export const CARROT_NFT_CONTRACT = "0x1a3902fF5CfDeD81D307CA89d8b2b045Abbbe0a7" as `0x${string}`;

// Carrot Token ID (for ERC-1155, each item type has an ID)
export const CARROT_TOKEN_ID = 1;

// ERC-1155 ABI - viem compatible
export const ERC1155_ABI = [
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" }
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface CarrotMintResult {
  success: boolean;
  transactionHash?: string;
  tokenId?: string;
  error?: string;
}

/**
 * Mint Carrot NFT (ERC-1155)
 * Mints 1 carrot NFT to the user's wallet
 */
export async function mintCarrotNFT(
  walletAddress: string
): Promise<CarrotMintResult> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        success: false,
        error: 'Wallet not connected. Please connect your wallet first.'
      };
    }

    const BASE_CHAIN_ID = 8453;

    // Verify we're on Base network
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainIdHex as string, 16);
    
    if (currentChainId !== BASE_CHAIN_ID) {
      return {
        success: false,
        error: `Please switch to Base network (Chain ID: ${BASE_CHAIN_ID}) in your wallet.`
      };
    }

    // Use viem to interact with the contract
    const { createWalletClient, custom } = await import('viem');
    const { base } = await import('viem/chains');

    const walletClient = createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });

    // Mint 1 carrot NFT (ERC-1155)
    // amount = 1 (we're minting 1 carrot)
    // data = 0x00 (empty bytes, not needed for simple mint)
    const hash = await walletClient.writeContract({
      address: CARROT_NFT_CONTRACT,
      abi: ERC1155_ABI,
      functionName: 'mint',
      args: [
        walletAddress as `0x${string}`,
        BigInt(CARROT_TOKEN_ID),
        BigInt(1), // amount = 1
        '0x00' as `0x${string}` // empty data
      ],
      account: walletAddress as `0x${string}`,
    });

    console.log('[Carrot NFT] Mint transaction hash:', hash);

    return {
      success: true,
      transactionHash: hash,
      tokenId: CARROT_TOKEN_ID.toString(),
    };
  } catch (error: unknown) {
    console.error('[Carrot NFT] Minting error:', error);
    
    // Check for specific errors
    if (error instanceof Error) {
      if (error.message.includes('chain') && error.message.includes('does not match')) {
        return {
          success: false,
          error: 'Please switch to Base network (Chain ID: 8453) in your wallet and try again.'
        };
      }
      
      // User rejected transaction
      if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
        return {
          success: false,
          error: 'Transaction was cancelled.'
        };
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to mint Carrot NFT';
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Check Carrot NFT balance (ERC-1155)
 * Returns how many carrot NFTs the user owns
 */
export async function checkCarrotBalance(
  walletAddress: string
): Promise<number> {
  try {
    if (typeof window === 'undefined') {
      return 0;
    }

    const { createPublicClient, http } = await import('viem');
    const { base } = await import('viem/chains');

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const balance = await publicClient.readContract({
      address: CARROT_NFT_CONTRACT,
      abi: ERC1155_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`, BigInt(CARROT_TOKEN_ID)],
    });

    return Number(balance);
  } catch (error: unknown) {
    console.error('[Carrot NFT] Balance check error:', error);
    return 0;
  }
}
