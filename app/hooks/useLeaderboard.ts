"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  level: number;
  wins: number;
  totalBattles: number;
  winRate: number;
}

// Global cache for leaderboard data
let globalCache: LeaderboardEntry[] | null = null;
let globalCacheTimestamp = 0;
const CACHE_DURATION = 60000; // 60 seconds

// Promise to prevent duplicate fetches
let fetchPromise: Promise<LeaderboardEntry[]> | null = null;

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(globalCache || []);
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchLeaderboard = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Return cached data if fresh and not forcing refresh
    if (!force && globalCache && (now - globalCacheTimestamp) < CACHE_DURATION) {
      setLeaderboard(globalCache);
      setLoading(false);
      return globalCache;
    }

    // If already fetching, wait for that promise
    if (fetchPromise) {
      try {
        const data = await fetchPromise;
        if (mountedRef.current) {
          setLeaderboard(data);
          setLoading(false);
        }
        return data;
      } catch {
        // Will be handled below
      }
    }

    setLoading(true);
    setError(null);

    // Create new fetch promise
    fetchPromise = (async () => {
      try {
        const response = await fetch('/api/leaderboard?sortBy=wins');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        const leaderboardData = data.leaderboard || [];
        
        // Update global cache
        globalCache = leaderboardData;
        globalCacheTimestamp = Date.now();
        
        return leaderboardData;
      } finally {
        fetchPromise = null;
      }
    })();

    try {
      const data = await fetchPromise;
      if (mountedRef.current) {
        setLeaderboard(data);
        setLoading(false);
      }
      return data;
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
      return [];
    }
  }, []);

  // Prefetch function that can be called from other components
  const prefetch = useCallback(() => {
    const now = Date.now();
    if (!globalCache || (now - globalCacheTimestamp) >= CACHE_DURATION) {
      fetchLeaderboard();
    }
  }, [fetchLeaderboard]);

  useEffect(() => {
    mountedRef.current = true;
    fetchLeaderboard();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    loading,
    error,
    refetch: () => fetchLeaderboard(true),
    prefetch,
  };
}

// Export prefetch function for use in other components
export function prefetchLeaderboard() {
  const now = Date.now();
  if (!globalCache || (now - globalCacheTimestamp) >= CACHE_DURATION) {
    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          const response = await fetch('/api/leaderboard?sortBy=wins');
          if (response.ok) {
            const data = await response.json();
            const leaderboardData: LeaderboardEntry[] = data.leaderboard || [];
            globalCache = leaderboardData;
            globalCacheTimestamp = Date.now();
            return leaderboardData;
          }
          return [];
        } catch {
          return [];
        } finally {
          fetchPromise = null;
        }
      })();
    }
  }
}
