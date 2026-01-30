import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

interface Quest {
  id: string;
  title: string;
  description: string;
  currentProgress: number;
  maxProgress: number;
  reward: string;
  status: 'active' | 'completed' | 'claimed';
  questType: string;
}

// Cache for quests per user (short cache for real-time updates)
const questsCache: Map<string, { quests: Quest[]; time: number }> = new Map();
const QUEST_CACHE_DURATION = 30 * 1000; // 30 seconds

export function useQuests() {
  const { address, isConnected } = useAccount();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const fetchQuests = useCallback(async (forceRefresh = false) => {
    if (!isConnected || !address) {
      setQuests([]);
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = questsCache.get(address);
      const now = Date.now();
      if (cached && (now - cached.time) < QUEST_CACHE_DURATION) {
        setQuests(cached.quests);
        setLoading(false);
        // Still fetch in background for fresh data
        fetch('/api/quests', {
          headers: {
            'x-wallet-address': address,
          },
        }).then(res => res.json()).then(data => {
          if (data.quests && isMountedRef.current) {
            questsCache.set(address, { quests: data.quests, time: Date.now() });
            setQuests(data.quests);
          }
        }).catch(() => {
          // Ignore background fetch errors
        });
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch('/api/quests', {
        headers: {
          'x-wallet-address': address,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quests');
      }

      const data = await response.json();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        // Update cache
        questsCache.set(address, { quests: data.quests, time: Date.now() });
        
        setQuests(data.quests);
        setError(null);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setQuests([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  // Listen for refresh events with proper cleanup
  useEffect(() => {
    const handleRefresh = () => {
      // Only refresh if component is mounted and user is connected
      if (address && isConnected && isMountedRef.current) {
        console.log('[useQuests] Refresh event received, fetching quests...');
        fetchQuests(true);
      }
    };

    window.addEventListener('refresh-quests-inventory', handleRefresh);
    
    // CRITICAL: Cleanup event listener on unmount
    return () => {
      window.removeEventListener('refresh-quests-inventory', handleRefresh);
    };
  }, [address, isConnected, fetchQuests]);

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const claimQuest = async (questId: string) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({ questId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to claim quest');
      }

      const claimData = await response.json();
      console.log('[useQuests] Quest claimed successfully:', claimData);

      // Verify quest was claimed by refetching
      const questsResponse = await fetch('/api/quests', {
        headers: {
          'x-wallet-address': address,
        },
      });

      if (questsResponse.ok && isMountedRef.current) {
        const data = await questsResponse.json();
        questsCache.set(address, { quests: data.quests, time: Date.now() });
        setQuests(data.quests);
        
        // Verify the specific quest was actually claimed
        const claimedQuest = data.quests.find((q: Quest) => q.id === questId);
        if (claimedQuest?.status !== 'claimed') {
          console.warn('[useQuests] Quest claim verification failed - status is not "claimed"');
        }
      }
      
      return claimData;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useQuests] Claim quest error:', errorMessage);
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  };

  return { 
    quests, 
    loading, 
    error, 
    claimQuest, 
    refetch: () => fetchQuests(true)
  };
}

