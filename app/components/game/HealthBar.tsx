"use client";

import React from 'react';
import { Sword } from 'lucide-react';
import styles from './HealthBar.module.css';

interface HealthBarProps {
  characterName: string;
  currentHp: number;
  maxHp: number;
  atk: number;
  position: 'left' | 'right';
  isAnimating?: boolean;
}

/**
 * HealthBar Component
 * Pixel-style health bar with character stats display
 */
export const HealthBar: React.FC<HealthBarProps> = ({
  characterName,
  currentHp,
  maxHp,
  atk,
  position,
  isAnimating = false,
}) => {
  // Calculate HP percentage
  const hpPercentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  // Determine health bar color based on percentage
  const getHealthColorClass = () => {
    if (hpPercentage > 50) return styles.healthHigh;
    if (hpPercentage > 25) return styles.healthMedium;
    return styles.healthLow;
  };

  return (
    <div 
      className={`${styles.healthBarContainer} ${styles[position]} ${isAnimating ? styles.animating : ''}`}
      data-testid={`health-bar-${position}`}
    >
      {/* Character Name */}
      <div className={styles.characterName}>{characterName}</div>

      {/* Stats Row: ATK and HP */}
      <div className={styles.statsRow}>
        <div className={styles.atkDisplay}>
          <Sword size={16} className={styles.atkIcon} />
          <span>ATK: {atk}</span>
        </div>
        <div className={styles.hpDisplay}>
          HP: {currentHp}/{maxHp}
        </div>
      </div>

      {/* Health Bar */}
      <div className={styles.healthBarWrapper}>
        <div
          className={`${styles.healthBarFill} ${getHealthColorClass()}`}
          style={{ width: `${hpPercentage}%` }}
          data-testid="health-bar-fill"
        />
      </div>
    </div>
  );
};

export default HealthBar;
