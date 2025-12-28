"use client";

import React from 'react';
import { X, CheckCircle2, Gamepad2, Trophy, Gift } from 'lucide-react';
import { useQuests } from '../../hooks/useQuests';
import { usePlayerProfile } from '../../hooks/usePlayerProfile';
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
    default:
      return <Gift size={24} />;
  }
};

export const QuestMenu = ({ isOpen, onClose }: QuestMenuProps) => {
  const { quests, loading, claimQuest } = useQuests();
  const { refetch: refetchProfile } = usePlayerProfile();
  
  const handleClaimQuest = async (questId: string) => {
    try {
      await claimQuest(questId);
      // Refetch profile to update XP/level display
      await refetchProfile();
    } catch (error) {
      console.error('Failed to claim quest:', error);
    }
  };

  if (!isOpen) return null;

  const getProgressPercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  return (
    <div className={styles.container}>
      <div className={styles.menuBox}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Daily Quests</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Quest List */}
        <div className={styles.questList}>
          {loading ? (
            <div>Loading quests...</div>
          ) : quests.length === 0 ? (
            <div>No quests available</div>
          ) : (
            quests.map((quest) => {
              const progressPercentage = getProgressPercentage(quest.currentProgress, quest.maxProgress);
              const isCompleted = quest.status === 'completed' || quest.currentProgress >= quest.maxProgress;

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
                    {isCompleted && (
                      <div className={styles.completedBadge}>
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBarBackground}>
                      <div 
                        className={`${styles.progressBarFill} ${isCompleted ? styles.progressBarComplete : ''}`}
                        style={{ width: `${progressPercentage}%` }}
                      >
                        <div className={styles.progressBarShine}></div>
                      </div>
                    </div>
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

                  {/* Claim Button */}
                  {isCompleted && quest.status === 'completed' && (
                    <button
                      className={styles.claimButton}
                      onClick={() => handleClaimQuest(quest.id)}
                    >
                      Claim Reward
                    </button>
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
