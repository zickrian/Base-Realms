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
        // Use absolute URL to avoid routing issues
        const apiUrl = '/api/player/profile';
        console.log('=== Fetching profile ===', { apiUrl, address });
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'x-wallet-address': address || '',
            'Content-Type': 'application/json',
          },
          cache: 'no-store', // Prevent caching
        });
        
        console.log('=== Profile API Response ===', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('=== Profile API Error ===', {
            status: response.status,
            error: errorText
          });
          throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('=== Profile data received ===', JSON.stringify(data, null, 2));
        
        if (data.profile) {
          console.log('=== Setting profile ===', {
            level: data.profile.level,
            currentXp: data.profile.currentXp,
            maxXp: data.profile.maxXp,
            xpPercentage: data.profile.xpPercentage,
            'Type check': {
              currentXpType: typeof data.profile.currentXp,
              currentXpValue: data.profile.currentXp
            }
          });
          setProfile(data.profile);
          setError(null);
        } else {
          console.error('=== No profile in response ===', data);
          setError('Invalid profile data');
        }
      } catch (err: any) {
        console.error('=== Profile fetch error ===', err);
        setError(err.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [address, isConnected]);

  const refetch = async () => {
    if (address && isConnected) {
      try {
        setLoading(true);
        const apiUrl = '/api/player/profile';
        console.log('=== Refetching profile ===', { apiUrl, address });
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'x-wallet-address': address || '',
            'Content-Type': 'application/json',
          },
          cache: 'no-store', // Prevent caching
        });
        
        console.log('=== Profile refetch API Response ===', {
          status: response.status,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('=== Profile refetch API Error ===', {
            status: response.status,
            error: errorText
          });
          throw new Error(`Failed to refetch profile: ${response.status}`);
        }

        const data = await response.json();
        console.log('=== Profile refetch data received ===', JSON.stringify(data, null, 2));
        
        if (data.profile) {
          console.log('=== Refetch - Setting profile ===', {
            currentXp: data.profile.currentXp,
            maxXp: data.profile.maxXp
          });
          setProfile(data.profile);
          setError(null);
        } else {
          console.error('=== No profile in refetch response ===', data);
        }
      } catch (err: any) {
        console.error('=== Profile refetch error ===', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return { profile, loading, error, refetch };
}

