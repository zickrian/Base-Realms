"use client";

import React, { useState, useEffect } from 'react';
import { X, Trophy, Medal, Award } from 'lucide-react';
import { useAccount } from 'wagmi';
import styles from './LeaderboardMenu.module.css';

interface LeaderboardMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  level: number;
  wins: number;
  totalBattles: number;
  winRate: number;
}

export const LeaderboardMenu = ({ isOpen, onClose }: LeaderboardMenuProps) => {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard?sortBy=wins');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        console.error('Failed to fetch leaderboard');
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={20} className={styles.goldIcon} />;
    if (rank === 2) return <Medal size={20} className={styles.silverIcon} />;
    if (rank === 3) return <Award size={20} className={styles.bronzeIcon} />;
    return <span className={styles.rankNumber}>{rank}</span>;
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isCurrentUser = (walletAddr: string) => {
    return address?.toLowerCase() === walletAddr.toLowerCase();
  };

  return (
    <div className={styles.container} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className={styles.menuBox}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Leaderboard</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Leaderboard List */}
        <div className={styles.leaderboardList}>
          {loading ? (
            <div className={styles.loadingMessage}>Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className={styles.emptyMessage}>No players found</div>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={entry.walletAddress}
                className={`${styles.leaderboardEntry} ${isCurrentUser(entry.walletAddress) ? styles.currentUser : ''}`}
              >
                <div className={styles.rankSection}>
                  {getRankIcon(entry.rank)}
                </div>
                <div className={styles.playerInfo}>
                  <div className={styles.playerAddress}>
                    {formatAddress(entry.walletAddress)}
                    {isCurrentUser(entry.walletAddress) && (
                      <span className={styles.youBadge}>YOU</span>
                    )}
                  </div>
                  <div className={styles.playerStats}>
                    <span>{entry.wins} Wins</span>
                    <span>•</span>
                    <span>{entry.totalBattles} Battles</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
