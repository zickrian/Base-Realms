import { useAccount, useReadContract, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '../lib/blockchain/nftService';

export function useNFTBalance() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data: balance, isLoading, error } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && chainId === base.id,
    },
  });

  return {
    balance: balance ? Number(balance) : 0,
    isLoading,
    error,
    hasNFT: balance ? Number(balance) > 0 : false,
  };
}
