"use client";

import React, { useState } from 'react';
import { X, CheckCircle2, Gamepad2, Trophy, Gift, Calendar } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useGameStore } from '../../stores/gameStore';
import styles from './QuestMenu.module.css';

interface QuestMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const getQuestIcon = (questType: string) => {
  switch (questType) {
    case 'play_games':
      return <Gamepad2 size={24} />;
    case 'win_games':
      return <Trophy size={24} />;
    case 'open_packs':
      return <Gift size={24} />;
    case 'daily_login':
      return <Calendar size={24} />;
    default:
      return <Gift size={24} />;
  }
};

export const QuestMenu = ({ isOpen, onClose }: QuestMenuProps) => {
  const { address } = useAccount();
  const { quests, questsLoading, claimQuest } = useGameStore();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaimQuest = async (questId: string) => {
    if (!address || claimingId) return;

    try {
      setClaimingId(questId);
      await claimQuest(address, questId);
      // XP bar will update automatically via store
    } catch (error) {
      console.error('Failed to claim quest:', error);
    } finally {
      setClaimingId(null);
    }
  };

  // if (!isOpen) return null; // Removed to prevent unmount crashing

  const getProgressPercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  return (
    <div className={styles.container} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className={`${styles.menuBox} bit16-container`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Quest Log</div>
          <button className={`${styles.closeButton} bit16-button has-red-background`} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Quest List */}
        <div className={styles.questList}>
          {questsLoading ? (
            <div>Loading quests...</div>
          ) : quests.length === 0 ? (
            <div>No quests available</div>
          ) : (
            quests.map((quest) => {
              const progressPercentage = getProgressPercentage(quest.currentProgress, quest.maxProgress);
              const isCompleted = quest.status === 'completed' || quest.currentProgress >= quest.maxProgress;
              const isClaimed = quest.status === 'claimed';
              const isClaiming = claimingId === quest.id;

              return (
                <div key={quest.id} className={styles.questCard}>
                  {/* Quest Header */}
                  <div className={styles.questHeader}>
                    <div className={styles.questIcon}>
                      {getQuestIcon(quest.questType)}
                    </div>
                    <div className={styles.questTitleSection}>
                      <h3 className={styles.questTitle}>{quest.title}</h3>
                      <p className={styles.questDescription}>{quest.description}</p>
                    </div>
                    {(isCompleted || isClaimed) && (
                      <div className={styles.completedBadge}>
                        <CheckCircle2 size={24} />
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className={styles.progressContainer}>
                    <div
                      className={`${styles.progressBarFill} ${isCompleted || isClaimed ? styles.progressBarComplete : ''}`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                    <div className={styles.progressText}>
                      <span>{quest.currentProgress} / {quest.maxProgress}</span>
                    </div>
                  </div>

                  {/* Reward Info */}
                  {quest.reward && (
                    <div className={styles.rewardInfo}>
                      <span className={styles.rewardLabel}>Reward:</span>
                      <span className={styles.rewardValue}>{quest.reward}</span>
                    </div>
                  )}

                  {/* Claim Button - only show if completed but not claimed */}
                  {isCompleted && quest.status === 'completed' && !isClaimed && (
                    <button
                      className={`${styles.claimButton} bit16-button has-red-background`}
                      onClick={() => handleClaimQuest(quest.id)}
                      disabled={isClaiming}
                    >
                      {isClaiming ? 'Claiming...' : 'CLAIM'}
                    </button>
                  )}

                  {/* Claimed indicator */}
                  {isClaimed && (
                    <div className={styles.claimedBadge}>
                      Claimed
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
