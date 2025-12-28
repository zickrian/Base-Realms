import { useAccount, useReadContract, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';

const NFT_CONTRACT_ADDRESS = "0x2FFb8aA5176c1da165EAB569c3e4089e84EC5816" as const;
const NFT_CONTRACT_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

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
