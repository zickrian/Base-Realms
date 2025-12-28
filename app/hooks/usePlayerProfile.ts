import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface PlayerProfile {
  level: number;
  currentXp: number;
  maxXp: number;
  xpPercentage: number;
  totalBattles: number;
  wins: number;
  losses: number;
  stage?: {
    id: string;
    name: string;
    stageNumber: number;
  };
}

export function usePlayerProfile() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/player/profile', {
          headers: {
            'x-wallet-address': address,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        setProfile(data.profile);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [address, isConnected]);

  return { profile, loading, error, refetch: () => {
    if (address && isConnected) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/player/profile', {
            headers: {
              'x-wallet-address': address,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch profile');
          }

          const data = await response.json();
          setProfile(data.profile);
          setError(null);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  } };
}

