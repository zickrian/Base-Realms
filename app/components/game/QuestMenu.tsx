"use client";

import React, { useState } from 'react';
import { Scroll, Sword, Coins, Skull, CheckSquare, X, ChevronLeft, Trophy, Star } from 'lucide-react';
import styles from './QuestMenu.module.css';

interface QuestMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Quest {
  id: number;
  title: string;
  description: string;
  difficulty: number;
  featuredReward: string; // Simplified for list view
  rewards: {
    gold: number;
    exp: number;
    item: string | null
  };
  status: 'active' | 'completed';
  type: 'hunt' | 'fetch' | 'boss' | 'gather';
}

export const QuestMenu = ({ isOpen, onClose }: QuestMenuProps) => {
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');

  if (!isOpen) return null;

  // Data Mockup Quest
  const quests: Quest[] = [
    {
      id: 1,
      title: "Membasmi Slime",
      description: "Para petani mengeluh tentang Slime yang memakan panen wortel mereka. Basmi 10 Slime Hijau di Ladang Timur.",
      difficulty: 1,
      featuredReward: "50 Gold",
      rewards: { gold: 50, exp: 100, item: "Ramuan Kecil" },
      status: "completed",
      type: "hunt"
    },
    {
      id: 2,
      title: "Surat Hilang",
      description: "Tukang pos menjatuhkan surat penting di Hutan Gelap. Temukan surat itu sebelum diambil Goblin.",
      difficulty: 2,
      featuredReward: "120 Gold",
      rewards: { gold: 120, exp: 250, item: "Sepatu Usang" },
      status: "active",
      type: "fetch"
    },
    {
      id: 3,
      title: "Raja Tikus",
      description: "Ada suara aneh di bawah tanah kedai. Selidiki dan kalahkan apapun yang ada di sana.",
      difficulty: 3,
      featuredReward: "Pedang Berkarat",
      rewards: { gold: 500, exp: 1000, item: "Pedang Berkarat" },
      status: "active",
      type: "boss"
    },
    {
      id: 4,
      title: "Herbal Langka",
      description: "Nenek penyihir membutuhkan 5 Daun Bulan untuk ramuannya. Tumbuh hanya di malam hari.",
      difficulty: 2,
      featuredReward: "80 Gold",
      rewards: { gold: 80, exp: 150, item: null },
      status: "active",
      type: "gather"
    }
  ];

  const filteredQuests = quests.filter(q => q.status === filter);

  // Helper icons - Using darker/earthy tones
  const getQuestIcon = (type: string) => {
    switch (type) {
      case 'hunt': return <Sword size={24} color="#8b0000" />; // Dark Red
      case 'fetch': return <Scroll size={24} color="#1e3a8a" />; // Dark Blue
      case 'boss': return <Skull size={24} color="#581c87" />; // Dark Purple
      case 'gather': return <Coins size={24} color="#b45309" />; // Amber/Gold
      default: return <Scroll size={24} color="#3e1f08" />;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.menuBox}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>Quest Board</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${filter === 'active' ? styles.tabActive : ''}`}
            onClick={() => setFilter('active')}
          >
            Available
          </button>
          <button
            className={`${styles.tab} ${filter === 'completed' ? styles.tabActive : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        {/* Quest List */}
        <div className={`${styles.questList} retroScroll`}>
          {filteredQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4 text-[#3e1f08]">
              <CheckSquare size={48} />
              <p className="text-xl">Tidak ada misi</p>
            </div>
          ) : (
            filteredQuests.map((quest) => (
              <div
                key={quest.id}
                className={styles.questItem}
                onClick={() => setSelectedQuest(quest)}
              >
                <div className="mr-3 p-2 bg-[#e6d2a0] rounded border border-[#b08d55]">
                  {getQuestIcon(quest.type)}
                </div>
                <div className={styles.questInfo}>
                  <div className={styles.questTitle}>{quest.title}</div>
                  <div className={styles.questMeta}>
                    <span className={styles.difficulty}>
                      {'★'.repeat(quest.difficulty)}
                    </span>
                    <span>•</span>
                    <span className="text-[#854d0e]">{quest.featuredReward}</span>
                  </div>
                </div>
                <div className="opacity-50 text-[#8b4513]">
                  <ChevronLeft size={24} className="rotate-180" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* DETAIL VIEW (Overlay/Slide-in) */}
        {selectedQuest && (
          <div className={styles.detailView}>
            {/* Detail Header */}
            <div className={styles.detailHeader}>
              <button
                className={styles.backButton}
                onClick={() => setSelectedQuest(null)}
              >
                <ChevronLeft size={28} />
                <span>BACK</span>
              </button>
            </div>

            {/* Detail Content */}
            <div className={styles.detailContent}>
              <div className={styles.mainIcon}>
                {/* Icon wrapper */}
                {getQuestIcon(selectedQuest.type)}
              </div>

              <h2 className={styles.detailTitleText}>{selectedQuest.title}</h2>



              <p className={styles.detailDesc}>{selectedQuest.description}</p>

              <div className={styles.rewardsSection}>
                <div className={styles.rewardsHeader}>REWARDS</div>
                <div className={styles.rewardsGrid}>
                  <div className={styles.rewardItem}>
                    <Coins size={24} color="#eab308" />
                    <span>{selectedQuest.rewards.gold} Gold</span>
                  </div>
                  <div className={styles.rewardItem}>
                    <Star size={24} color="#2563eb" />
                    <span>{selectedQuest.rewards.exp} XP</span>
                  </div>
                  {selectedQuest.rewards.item && (
                    <div className={styles.rewardItem}>
                      <Trophy size={24} color="#9333ea" />
                      <span>{selectedQuest.rewards.item}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className={styles.detailFooter}>
              {selectedQuest.status === 'active' ? (
                <button
                  className={styles.actionButton}
                  onClick={() => {
                    alert(`Accepted: ${selectedQuest.title}`);
                    // Logic accept quest here
                    setSelectedQuest(null);
                  }}
                >
                  ACCEPT QUEST
                </button>
              ) : (
                <div className={styles.completedBadge}>
                  QUEST COMPLETE
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
