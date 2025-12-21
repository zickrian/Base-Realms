"use client";

import Image from "next/image";
import styles from "./DailyPacks.module.css";

interface DailyPacksProps {
  questCount: number;
  onQuestClick?: () => void;
}

const cardPacks = [
  { id: 'dragon', src: '/game/illustrations/card-dragon.svg', alt: 'Dragon Card' },
  { id: 'tower', src: '/game/illustrations/card-tower.svg', alt: 'Tower Card' },
  { id: 'knight', src: '/game/illustrations/card-knight.svg', alt: 'Knight Card' },
  { id: 'magic', src: '/game/illustrations/card-magic.svg', alt: 'Magic Card' },
];

export function DailyPacks({ questCount, onQuestClick }: DailyPacksProps) {
  return (
    <div className={styles.container}>
      <div className={styles.packsSection}>
        <span className={styles.label}>FREE DAILY PACKS</span>
        <div className={styles.cardsRow}>
          {cardPacks.map((pack) => (
            <div key={pack.id} className={styles.cardPack}>
              <Image 
                src={pack.src} 
                alt={pack.alt} 
                width={56} 
                height={72}
                className={styles.cardImage}
              />
            </div>
          ))}
        </div>
      </div>

      <button className={styles.questButton} onClick={onQuestClick}>
        <Image 
          src="/game/icons/quest.png" 
          alt="Quests" 
          width={32} 
          height={32}
          className={styles.questIcon}
        />
        {questCount > 0 && (
          <div className={styles.questBadge}>{questCount}</div>
        )}
        <span className={styles.questLabel}>QUESTS</span>
      </button>
    </div>
  );
}
