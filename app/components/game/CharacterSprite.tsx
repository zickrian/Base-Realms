"use client";

import React, { useState, useEffect } from 'react';

import styles from './CharacterSprite.module.css';
import { getStorageUrl } from '../../utils/supabaseStorage';

interface CharacterSpriteProps {
  position: 'left' | 'right';
  isHit: boolean;
  isAttacking: boolean;
  damageAmount?: number | null;
}

// Dragon sprite URL from Supabase storage
const DRAGON_SPRITE_URL = getStorageUrl('battle/output-onlinegiftools.gif');

/**
 * CharacterSprite Component
 * Displays character with hit effects and attack animations
 */
export const CharacterSprite: React.FC<CharacterSpriteProps> = ({
  position,
  isHit,
  isAttacking,
  damageAmount,
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
  const spriteClasses = [
    styles.sprite,
    position === 'right' ? styles.mirrored : '',
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

        <img
          src={DRAGON_SPRITE_URL}
          alt={position === 'left' ? 'Player Dragon' : 'Enemy Dragon'}
          width={240}
          height={240}
          className={spriteClasses}
        />
      </div>

      {/* Character shadow */}
      <div className={styles.shadow} />
    </div>
  );
};

export default CharacterSprite;
