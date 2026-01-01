import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export function useDailyPacks() {
  const { address, isConnected } = useAccount();
  const [packCount, setPackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setPackCount(0);
      setLoading(false);
      return;
    }

    const fetchDailyPacks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/daily-packs', {
          headers: {
            'x-wallet-address': address,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch daily packs');
        }

        const data = await response.json();
        setPackCount(data.packCount || 0);
        setError(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setPackCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyPacks();
  }, [address, isConnected]);

  const claimPack = async (): Promise<boolean> => {
    if (!address || !isConnected) return false;

    // Prevent multiple simultaneous requests
    if (isClaiming) {
      throw new Error('Claim already in progress. Please wait...');
    }

    // Check if pack count is already 0 (already claimed)
    if (packCount <= 0) {
      throw new Error('You have already claimed your free daily pack today. Please come back tomorrow!');
    }

    setIsClaiming(true);
    try {
      const response = await fetch('/api/daily-packs', {
        method: 'POST',
        headers: {
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to claim daily pack';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setPackCount(data.packCount);
      setError(null);
      return true; // Success
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsClaiming(false);
    }
  };

  const refetch = async (): Promise<void> => {
    if (!address || !isConnected) return;

    try {
      setLoading(true);
      const response = await fetch('/api/daily-packs', {
        headers: {
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch daily packs');
      }

      const data = await response.json();
      setPackCount(data.packCount || 0);
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { packCount, loading, error, isClaiming, claimPack, refetch };
}

