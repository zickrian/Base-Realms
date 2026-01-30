"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

import styles from './CharacterSprite.module.css';
import { getStorageUrl } from '../../utils/supabaseStorage';

interface CharacterSpriteProps {
  position: 'left' | 'right';
  isHit: boolean;
  isAttacking: boolean;
  damageAmount?: number | null;
  imageUrl?: string | null;
}

// Default enemy sprite URL - using goblins.png
const ENEMY_SPRITE_URL = '/avatar/goblins.png';

/**
 * CharacterSprite Component
 * Displays character with hit effects and attack animations
 */
export const CharacterSprite: React.FC<CharacterSpriteProps> = ({
  position,
  isHit,
  isAttacking,
  damageAmount,
  imageUrl,
}) => {
  const [showDamage, setShowDamage] = useState(false);
  const [currentDamage, setCurrentDamage] = useState<number | null>(null);
  const [damageKey, setDamageKey] = useState(0);

  // Show damage number when hit
  useEffect(() => {
    if (isHit && damageAmount) {
      setCurrentDamage(damageAmount);
      setShowDamage(true);
      setDamageKey(prev => prev + 1);

      // Hide damage number after animation
      const timer = setTimeout(() => {
        setShowDamage(false);
        setCurrentDamage(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isHit, damageAmount]);

  // Build sprite class names
  // Player (left) faces right, Enemy (right) faces left (no mirroring)
  const spriteClasses = [
    styles.sprite,
    // Removed mirroring for enemy - enemy now faces left towards player
    isHit ? styles.hitEffect : '',
    isAttacking ? styles.attacking : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.spriteContainer} data-testid={`character-sprite-${position}`}>
      <div className={styles.spriteWrapper}>
        {/* Damage number */}
        {showDamage && currentDamage && (
          <div
            key={damageKey}
            className={styles.damageNumber}
            data-testid="damage-number"
          >
            -{currentDamage}
          </div>
        )}

        {/* Character sprite */}
        <Image
          src={position === 'left' 
            ? (imageUrl || getStorageUrl('battle/human.png'))
            : ENEMY_SPRITE_URL
          }
          alt={position === 'left' ? 'Player' : 'Enemy'}
          width={160}
          height={160}
          className={spriteClasses}
          priority
        />
      </div>

      {/* Character shadow */}
      <div className={styles.shadow} />
    </div>
  );
};

export default CharacterSprite;
