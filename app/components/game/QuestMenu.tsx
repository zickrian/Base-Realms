"use client";

import React from 'react';
import { X, CheckCircle2, Gamepad2, Trophy, Gift } from 'lucide-react';
import styles from './QuestMenu.module.css';

interface QuestMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Quest {
  id: number;
  title: string;
  description: string;
  currentProgress: number;
  maxProgress: number;
  reward?: string;
  status: 'active' | 'completed';
  icon: React.ReactNode;
}

export const QuestMenu = ({ isOpen, onClose }: QuestMenuProps) => {
  if (!isOpen) return null;

  // Mock data untuk 3 quest
  const quests: Quest[] = [
    {
      id: 1,
      title: "Play 3 Games",
      description: "Complete 3 battles to earn rewards",
      currentProgress: 2,
      maxProgress: 3,
      reward: "100 Gold + 50 XP",
      status: "active",
      icon: <Gamepad2 size={24} />
    },
    {
      id: 2,
      title: "Win 3 Games",
      description: "Win 3 battles to prove your strength",
      currentProgress: 1,
      maxProgress: 3,
      reward: "200 Gold + 100 XP",
      status: "active",
      icon: <Trophy size={24} />
    },
    {
      id: 3,
      title: "Open Free Cards",
      description: "Open your free card pack",
      currentProgress: 0,
      maxProgress: 1,
      reward: "50 Gold + 25 XP",
      status: "active",
      icon: <Gift size={24} />
    }
  ];

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
          {quests.map((quest) => {
            const progressPercentage = getProgressPercentage(quest.currentProgress, quest.maxProgress);
            const isCompleted = quest.status === 'completed' || quest.currentProgress >= quest.maxProgress;

            return (
              <div key={quest.id} className={styles.questCard}>
                {/* Quest Header */}
                <div className={styles.questHeader}>
                  <div className={styles.questIcon}>
                    {quest.icon}
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
