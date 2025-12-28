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

      // Refetch quests
      const questsResponse = await fetch('/api/quests', {
        headers: {
          'x-wallet-address': address,
        },
      });

      if (questsResponse.ok) {
        const data = await questsResponse.json();
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

