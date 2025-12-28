import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isConnected || !address) {
      setQuests([]);
      setLoading(false);
      return;
    }

    // Check cache first
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
        if (data.quests) {
          questsCache.set(address, { quests: data.quests, time: now });
          setQuests(data.quests);
        }
      }).catch(() => {
        // Ignore background fetch errors
      });
      return;
    }

    const fetchQuests = async () => {
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
        
        // Update cache
        questsCache.set(address, { quests: data.quests, time: now });
        
        setQuests(data.quests);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setQuests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();
  }, [address, isConnected]);

  const claimQuest = async (questId: string) => {
    if (!address || !isConnected) return;

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
        throw new Error('Failed to claim quest');
      }

      // Refetch quests and update cache
      const questsResponse = await fetch('/api/quests', {
        headers: {
          'x-wallet-address': address,
        },
      });

      if (questsResponse.ok) {
        const data = await questsResponse.json();
        questsCache.set(address, { quests: data.quests, time: Date.now() });
        setQuests(data.quests);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return { quests, loading, error, claimQuest, refetch: () => {
    if (address && isConnected) {
      const fetchQuests = async () => {
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
          questsCache.set(address, { quests: data.quests, time: Date.now() });
          setQuests(data.quests);
          setError(null);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchQuests();
    }
  } };
}

