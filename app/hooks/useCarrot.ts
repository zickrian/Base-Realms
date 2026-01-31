/**
 * Carrot Hook
 * Manages carrot planting, growth, and harvesting state
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface CarrotStatus {
  id: string;
  plantedAt: string;
  harvestableAt: string;
  status: 'planted' | 'harvestable' | 'harvested';
  isHarvestable: boolean;
  timeRemaining: number; // milliseconds
}

export const useCarrot = () => {
  const { address, isConnected } = useAccount();
  const [carrotStatus, setCarrotStatus] = useState<CarrotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current carrot status
  const fetchStatus = useCallback(async () => {
    if (!address || !isConnected) {
      setCarrotStatus(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/carrot/status', {
        method: 'GET',
        headers: {
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch carrot status');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Invalid response from server');
      }

      setCarrotStatus(data.carrot);
    } catch (err) {
      console.error('[useCarrot] Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch carrot status';
      setError(errorMessage);
      // Don't clear carrot status on error - keep showing last known state
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Plant a new carrot
  const plantCarrot = useCallback(async () => {
    if (!address || !isConnected) {
      const error = new Error('Wallet not connected. Please connect your wallet.');
      setError(error.message);
      throw error;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/carrot/plant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to plant carrot');
      }

      if (!data.success) {
        throw new Error('Invalid response from server');
      }

      console.log('[useCarrot] Carrot planted successfully:', data.carrot);

      // Refresh status after planting
      await fetchStatus();

      return data.carrot;
    } catch (err) {
      console.error('[useCarrot] Plant error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to plant carrot';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, fetchStatus]);

  // Harvest carrot (after minting NFT)
  const harvestCarrot = useCallback(async (transactionHash: string, tokenId?: string) => {
    if (!address || !isConnected) {
      const error = new Error('Wallet not connected. Please connect your wallet.');
      setError(error.message);
      throw error;
    }

    if (!transactionHash) {
      const error = new Error('Transaction hash is required');
      setError(error.message);
      throw error;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/carrot/harvest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          transactionHash,
          tokenId: tokenId || '1',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to harvest carrot');
      }

      if (!data.success) {
        throw new Error('Invalid response from server');
      }

      console.log('[useCarrot] Carrot harvested successfully:', data.carrot);

      // Clear carrot status after harvest
      setCarrotStatus(null);

      return data.carrot;
    } catch (err) {
      console.error('[useCarrot] Harvest error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to harvest carrot';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Fetch status on mount and when address changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for status updates every 30 seconds
  useEffect(() => {
    if (!address || !isConnected) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [address, isConnected, fetchStatus]);

  return {
    carrotStatus,
    loading,
    error,
    plantCarrot,
    harvestCarrot,
    refreshStatus: fetchStatus,
  };
};
