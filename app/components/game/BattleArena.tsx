"use client";

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import styles from './BattleArena.module.css';
import { HealthBar } from './HealthBar';
import { CharacterSprite } from './CharacterSprite';
import { ResultModal } from './ResultModal';
import { useBattleStore } from '../../stores/battleStore';
import { useGameStore } from '../../stores/gameStore';
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
  const { address } = useAccount();
  const { refreshQuests, refreshProfile } = useGameStore();
  const {
    status,
    currentTurn,
    player,
    enemy,
    lastDamage,
    isHitEffectActive,
    hitTarget,
    playerImageUrl,
    executeAttack,
    nextTurn,
    setStatus,
    setHitEffect,
  } = useBattleStore();
  
  const [battleId, setBattleId] = useState<string | null>(null);
  const battleStartedRef = useRef(false);
  const battleCompletedRef = useRef(false);

  const [isAttacking, setIsAttacking] = useState(false);
  const [attackingCharacter, setAttackingCharacter] = useState<'player' | 'enemy' | null>(null);
  const turnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hitEffectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to complete battle - called when battle ends
  const completeBattle = useCallback(async (bId: string, result: 'win' | 'loss') => {
    if (battleCompletedRef.current || !address) {
      console.log('[BattleArena] Battle already completed or no address');
      return;
    }
    
    battleCompletedRef.current = true;
    console.log('[BattleArena] Completing battle:', bId, 'result:', result);
    
    try {
      const response = await fetch('/api/battles/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          battleId: bId,
          result: result,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[BattleArena] Battle completed successfully:', data);
        
        // Immediately refresh quests to show updated progress
        // No delay needed - database is already updated
        try {
          await refreshQuests(address);
          console.log('[BattleArena] Quests refreshed successfully');
        } catch (e) {
          console.error('[BattleArena] Failed to refresh quests:', e);
        }
        
        try {
          await refreshProfile(address);
          console.log('[BattleArena] Profile refreshed successfully');
        } catch (e) {
          console.error('[BattleArena] Failed to refresh profile:', e);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[BattleArena] Failed to complete battle:', errorData);
        battleCompletedRef.current = false; // Allow retry
      }
    } catch (error) {
      console.error('[BattleArena] Error completing battle:', error);
      battleCompletedRef.current = false; // Allow retry
    }
  }, [address, refreshQuests, refreshProfile]);

  // Start battle when component mounts - create battle record
  useEffect(() => {
    if (status === 'ready' && !battleStartedRef.current && address) {
      battleStartedRef.current = true;
      
      // Create battle record
      fetch('/api/battles/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          battleType: 'pve',
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.battle) {
            console.log('[BattleArena] Battle started:', data.battle.id);
            setBattleId(data.battle.id);
          }
        })
        .catch(err => {
          console.error('Failed to create battle:', err);
        });
      
      setStatus('in_progress');
    }
  }, [status, setStatus, address]);

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

  // Determine if battle has ended
  const battleEnded = status === 'victory' || status === 'defeat';

  // Complete battle when status changes to victory/defeat
  useEffect(() => {
    if (battleEnded && battleId && !battleCompletedRef.current) {
      const result = status === 'victory' ? 'win' : 'loss';
      console.log('[BattleArena] Battle ended, completing with result:', result);
      completeBattle(battleId, result);
    }
  }, [battleEnded, battleId, status, completeBattle]);

  // Handle battle end - navigate back to home
  const handleBattleEnd = useCallback(() => {
    onBattleEnd();
  }, [onBattleEnd]);

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
              imageUrl={playerImageUrl}
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
