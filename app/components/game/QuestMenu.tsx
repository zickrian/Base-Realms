"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./QuestMenu.module.css";

interface QuestMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type QuestTab = "daily" | "weekly" | "special";

interface Quest {
  id: string;
  name: string;
  description: string;
  progress: number;
  maxProgress: number;
  reward: string;
  rewardIcon?: string;
  completed: boolean;
}

const dailyQuests: Quest[] = [
  {
    id: "win-3-battles",
    name: "Win 3 Battles",
    description: "Win 3 battles to complete this quest",
    progress: 2,
    maxProgress: 3,
    reward: "100 XP",
    completed: false,
  },
  {
    id: "collect-5-cards",
    name: "Collect 5 Cards",
    description: "Open 5 card packs",
    progress: 5,
    maxProgress: 5,
    reward: "50 XP",
    completed: true,
  },
  {
    id: "daily-login",
    name: "Daily Login",
    description: "Login to claim your reward",
    progress: 1,
    maxProgress: 1,
    reward: "25 XP",
    completed: true,
  },
];

const weeklyQuests: Quest[] = [
  {
    id: "win-20-battles",
    name: "Win 20 Battles",
    description: "Win 20 battles this week",
    progress: 12,
    maxProgress: 20,
    reward: "500 XP",
    completed: false,
  },
  {
    id: "reach-level-10",
    name: "Reach Level 10",
    description: "Level up to level 10",
    progress: 8,
    maxProgress: 10,
    reward: "200 XP",
    completed: false,
  },
];

const specialQuests: Quest[] = [
  {
    id: "first-victory",
    name: "First Victory",
    description: "Win your first battle",
    progress: 1,
    maxProgress: 1,
    reward: "150 XP",
    completed: true,
  },
];

export function QuestMenu({ isOpen, onClose }: QuestMenuProps) {
  const [activeTab, setActiveTab] = useState<QuestTab>("daily");

  if (!isOpen) return null;

  const getQuests = () => {
    switch (activeTab) {
      case "daily":
        return dailyQuests;
      case "weekly":
        return weeklyQuests;
      case "special":
        return specialQuests;
      default:
        return dailyQuests;
    }
  };

  const quests = getQuests();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>QUESTS</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <span className={styles.closeIcon}>✕</span>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "daily" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            Daily
          </button>
          <button
            className={`${styles.tab} ${activeTab === "weekly" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("weekly")}
          >
            Weekly
          </button>
          <button
            className={`${styles.tab} ${activeTab === "special" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("special")}
          >
            Special
          </button>
        </div>

        {/* Quest List */}
        <div className={styles.questList}>
          {quests.map((quest) => (
            <div key={quest.id} className={styles.questItem}>
              <div className={styles.questIcon}>
                {quest.completed ? (
                  <span className={styles.checkmark}>✓</span>
                ) : (
                  <span className={styles.questNumber}>!</span>
                )}
              </div>
              <div className={styles.questContent}>
                <div className={styles.questHeader}>
                  <h3 className={styles.questName}>{quest.name}</h3>
                  <span className={styles.questReward}>{quest.reward}</span>
                </div>
                <p className={styles.questDescription}>{quest.description}</p>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${(quest.progress / quest.maxProgress) * 100}%`,
                    }}
                  />
                </div>
                <div className={styles.progressText}>
                  {quest.progress} / {quest.maxProgress}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

