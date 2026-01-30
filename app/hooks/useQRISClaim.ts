import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  QRIS_CLAIM_HASH_CONTRACT_ADDRESS,
  QRIS_CLAIM_HASH_CONTRACT_ABI,
} from '@/app/lib/blockchain/contracts';

export function useQRISClaim() {
  const { address } = useAccount();
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [isLoadingProof, setIsLoadingProof] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, isSuccess } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const checkEligibility = useCallback(async () => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    setIsCheckingEligibility(true);
    setError(null);

    try {
      const response = await fetch('/api/qris/eligibility', {
        headers: {
          'x-wallet-address': address,
        },
      });

      const data = await response.json();

      console.log('[QRIS Claim] Eligibility check result:', data);

      if (data.eligible) {
        setIsEligible(true);
        return true;
      } else {
        setIsEligible(false);
        return false;
      }
    } catch {
      setError('Failed to check eligibility');
      setIsEligible(false);
      return false;
    } finally {
      setIsCheckingEligibility(false);
    }
  }, [address]);

  const claim = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setIsLoadingProof(true);
    setError(null);

    try {
      const proofResponse = await fetch('/api/qris/proof', {
        headers: {
          'x-wallet-address': address,
        },
      });

      const data = await proofResponse.json();

      if (!proofResponse.ok) {
        throw new Error(data.error || 'Failed to get proof');
      }

      const { claimId, proofHash } = data;

      if (!claimId || claimId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error('Invalid claimId received from server');
      }
      if (!proofHash || proofHash.length !== 66) {
        throw new Error('Invalid proofHash received from server');
      }

      const contractAddress = QRIS_CLAIM_HASH_CONTRACT_ADDRESS;
      if (!contractAddress || contractAddress === '') {
        throw new Error('QRIS hash contract address not set. Set NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS in env.');
      }

      const claimIdBytes32 = (typeof claimId === 'string' && claimId.startsWith('0x') ? claimId : `0x${claimId}`).toLowerCase() as `0x${string}`;
      const proofHashBytes32 = (typeof proofHash === 'string' && proofHash.startsWith('0x') ? proofHash : `0x${proofHash}`).toLowerCase() as `0x${string}`;

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: QRIS_CLAIM_HASH_CONTRACT_ABI,
        functionName: 'claim',
        args: [claimIdBytes32, proofHashBytes32],
      });
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to claim';
      
      // Check for common errors
      if (errorMessage.includes('insufficient funds') || 
          errorMessage.includes('gas') || 
          errorMessage.includes('fee')) {
        errorMessage = 'Insufficient ETH for gas fee. Please top up your wallet with ETH on Base network.';
      } else if (errorMessage.includes('Invalid proof')) {
        errorMessage = 'Invalid proof. Check QRIS_CLAIM_SECRET in env matches contract claimSecretHash.';
      } else if (errorMessage.includes('Already claimed')) {
        errorMessage = 'This payment has already been claimed.';
      }
      
      setError(errorMessage);
      console.error('[QRIS Claim] Error:', err);
    } finally {
      setIsLoadingProof(false);
    }
  };

  return {
    checkEligibility,
    claim,
    isCheckingEligibility,
    isEligible,
    isLoadingProof,
    isPending,
    isConfirming,
    isSuccess: isSuccess && isConfirmed,
    hash,
    error,
  };
}
