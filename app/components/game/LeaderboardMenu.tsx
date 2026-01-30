"use client";

import React, { useEffect } from 'react';
import { X, Trophy, Medal, Award } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import styles from './LeaderboardMenu.module.css';

interface LeaderboardMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardMenu = ({ isOpen, onClose }: LeaderboardMenuProps) => {
  const { address } = useAccount();
  const { leaderboard, loading, refetch } = useLeaderboard();

  useEffect(() => {
    if (isOpen) {
      // Refetch when opening to get latest data
      refetch();
    }
  }, [isOpen, refetch]);

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
      <div className={`${styles.menuBox} bit16-container`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Leaderboard</div>
          <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading && leaderboard.length === 0 ? (
            <div className={styles.leaderboardList}>
              {[...Array(10)].map((_, i) => (
                <div key={i} className={styles.skeletonEntry}>
                  <div className={styles.skeletonRank} />
                  <div className={styles.skeletonInfo}>
                    <div className={styles.skeletonAddress} />
                    <div className={styles.skeletonStats} />
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className={styles.emptyMessage}>No players found</div>
          ) : (
            <div className={styles.leaderboardList}>
              {leaderboard.map((entry) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
