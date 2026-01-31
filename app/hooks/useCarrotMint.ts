/**
 * Carrot Mint Hook - Wagmi Integration
 * Handles ERC-1155 carrot NFT minting using wagmi hooks
 */

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
import { CARROT_NFT_CONTRACT, CARROT_TOKEN_ID, ERC1155_ABI } from '../lib/blockchain/carrotNFT';

export const useCarrotMint = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isOnBase = chainId === base.id;

  const {
    writeContract,
    data: hash,
    isPending: isWriting,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const mintCarrot = async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet.');
    }

    if (!isOnBase) {
      throw new Error('Please switch to Base network to mint Carrot NFT.');
    }

    try {
      // Mint 1 carrot NFT (ERC-1155)
      await writeContract({
        address: CARROT_NFT_CONTRACT,
        abi: ERC1155_ABI,
        functionName: 'mint',
        args: [
          address,
          BigInt(CARROT_TOKEN_ID),
          BigInt(1), // amount = 1
          '0x00' as `0x${string}` // empty data
        ],
      });
    } catch (error) {
      console.error('[useCarrotMint] Mint error:', error);
      throw error;
    }
  };

  return {
    mintCarrot,
    hash,
    isWriting,
    isConfirming,
    isConfirmed,
    isPending: isWriting || isConfirming,
    error: writeError || confirmError,
    reset: resetWrite,
    isOnBase,
    address,
    isConnected,
  };
};
