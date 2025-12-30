"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import styles from './BattleArena.module.css';
import { HealthBar } from './HealthBar';
import { CharacterSprite } from './CharacterSprite';
import { ResultModal } from './ResultModal';
import { useBattleStore } from '../../stores/battleStore';
import { getStorageUrl } from '../../utils/supabaseStorage';

interface BattleArenaProps {
  onBattleEnd: () => void;
}

// Background URL from Supabase storage
const BACKGROUND_URL = getStorageUrl('battle/gladiator.png');

// Turn delay in milliseconds
const TURN_DELAY = 1500;
const HIT_EFFECT_DURATION = 300;

/**
 * BattleArena Component
 * Main battle scene with turn-based combat
 */
export const BattleArena: React.FC<BattleArenaProps> = ({ onBattleEnd }) => {
  const {
    status,
    currentTurn,
    player,
    enemy,
    lastDamage,
    isHitEffectActive,
    hitTarget,
    executeAttack,
    nextTurn,
    setStatus,
    setHitEffect,
  } = useBattleStore();

  const [isAttacking, setIsAttacking] = useState(false);
  const [attackingCharacter, setAttackingCharacter] = useState<'player' | 'enemy' | null>(null);
  const turnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hitEffectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start battle when component mounts
  useEffect(() => {
    if (status === 'ready') {
      setStatus('in_progress');
    }
  }, [status, setStatus]);

  // Execute turn logic
  const executeTurn = useCallback(() => {
    if (status !== 'in_progress') return;

    // Show attacking animation
    setIsAttacking(true);
    setAttackingCharacter(currentTurn);

    // Execute attack after brief delay for animation
    setTimeout(() => {
      executeAttack();
      setIsAttacking(false);
      setAttackingCharacter(null);
    }, 400);
  }, [status, currentTurn, executeAttack]);

  // Handle turn progression
  useEffect(() => {
    if (status !== 'in_progress') return;

    // Clear any existing timeout
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
    }

    // Wait for turn delay then execute
    turnTimeoutRef.current = setTimeout(() => {
      executeTurn();
    }, TURN_DELAY);

    return () => {
      if (turnTimeoutRef.current) {
        clearTimeout(turnTimeoutRef.current);
      }
    };
  }, [status, currentTurn, executeTurn]);

  // Handle hit effect and turn switch
  useEffect(() => {
    if (isHitEffectActive && hitTarget) {
      // Clear hit effect after duration
      hitEffectTimeoutRef.current = setTimeout(() => {
        setHitEffect(null);

        // Switch turn if battle is still in progress
        if (status === 'in_progress') {
          nextTurn();
        }
      }, HIT_EFFECT_DURATION);

      return () => {
        if (hitEffectTimeoutRef.current) {
          clearTimeout(hitEffectTimeoutRef.current);
        }
      };
    }
  }, [isHitEffectActive, hitTarget, status, nextTurn, setHitEffect]);

  // Handle battle end
  const handleBattleEnd = useCallback(() => {
    onBattleEnd();
  }, [onBattleEnd]);

  // Determine if battle has ended
  const battleEnded = status === 'victory' || status === 'defeat';

  return (
    <div className={styles.arenaContainer} data-testid="battle-arena">
      {/* Background */}
      <div
        className={styles.arenaBackground}
        style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
      />

      {/* Overlay */}
      <div className={styles.arenaOverlay} />

      {/* Content */}
      <div className={styles.arenaContent}>
        {/* Health Bars */}
        <div className={styles.healthBarsContainer}>
          <HealthBar
            characterName={player.name}
            currentHp={player.currentHp}
            maxHp={player.maxHp}
            atk={player.atk}
            position="left"
            isAnimating={hitTarget === 'player'}
          />
          <HealthBar
            characterName={enemy.name}
            currentHp={enemy.currentHp}
            maxHp={enemy.maxHp}
            atk={enemy.atk}
            position="right"
            isAnimating={hitTarget === 'enemy'}
          />
        </div>

        {/* Characters */}
        <div className={styles.charactersContainer}>
          {/* Player Character (Left) */}
          <div className={`${styles.characterWrapper} ${styles.playerCharacter}`}>
            <CharacterSprite
              position="left"
              isHit={hitTarget === 'player'}
              isAttacking={isAttacking && attackingCharacter === 'player'}
              damageAmount={lastDamage?.target === 'player' ? lastDamage.amount : null}
            />
          </div>

          {/* VS Indicator */}
          <div className={styles.vsIndicator}>VS</div>

          {/* Attack Arrow */}
          {isAttacking && attackingCharacter === 'player' && (
            <div className={`${styles.attackArrow} ${styles.attackArrowLeft}`}>
              ⚔️
            </div>
          )}
          {isAttacking && attackingCharacter === 'enemy' && (
            <div className={`${styles.attackArrow} ${styles.attackArrowRight}`}>
              ⚔️
            </div>
          )}

          {/* Enemy Character (Right) */}
          <div className={`${styles.characterWrapper} ${styles.enemyCharacter}`}>
            <CharacterSprite
              position="right"
              isHit={hitTarget === 'enemy'}
              isAttacking={isAttacking && attackingCharacter === 'enemy'}
              damageAmount={lastDamage?.target === 'enemy' ? lastDamage.amount : null}
            />
          </div>
        </div>

        {/* Turn Indicator */}
        {status === 'in_progress' && !isAttacking && (
          <div className={styles.turnIndicator}>
            {currentTurn === 'player' ? "Player's Turn" : "Enemy's Turn"}
          </div>
        )}
      </div>

      {/* Result Modal */}
      {battleEnded && (
        <ResultModal
          result={status as 'victory' | 'defeat'}
          onClose={handleBattleEnd}
        />
      )}
    </div>
  );
};

export default BattleArena;
