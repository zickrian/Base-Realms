import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

export function useDailyPacks() {
  const { address, isConnected } = useAccount();
  const [packCount, setPackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err: any) {
        setError(err.message);
        setPackCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyPacks();
  }, [address, isConnected]);

  const claimPack = async () => {
    if (!address || !isConnected) return;

    try {
      const response = await fetch('/api/daily-packs', {
        method: 'POST',
        headers: {
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to claim daily pack');
      }

      const data = await response.json();
      setPackCount(data.packCount);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { packCount, loading, error, claimPack, refetch: () => {
    if (address && isConnected) {
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
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchDailyPacks();
    }
  } };
}

