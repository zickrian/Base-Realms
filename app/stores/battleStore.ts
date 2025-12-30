"use client";

import { create } from 'zustand';
import {
  BattleStore,
  BattleStatus,
  INITIAL_PLAYER_STATS,
  INITIAL_ENEMY_STATS,
  VALID_TRANSITIONS,
} from '../types/battle';

/**
 * Calculate damage result
 * Returns the new HP after damage (minimum 0)
 */
export const calculateDamage = (atk: number, targetHp: number): number => {
  return Math.max(0, targetHp - atk);
};

/**
 * Initial battle state
 */
const initialBattleState = {
  status: 'loading' as BattleStatus,
  currentTurn: 'player' as const,
  turnCount: 0,
  player: { ...INITIAL_PLAYER_STATS },
  enemy: { ...INITIAL_ENEMY_STATS },
  lastDamage: null,
  isHitEffectActive: false,
  hitTarget: null,
};

/**
 * Battle Store using Zustand
 * Manages all battle state and actions
 */
export const useBattleStore = create<BattleStore>((set, get) => ({
  ...initialBattleState,

  /**
   * Initialize battle with default stats
   * Sets player as first attacker
   */
  initBattle: () => {
    set({
      status: 'ready',
      currentTurn: 'player',
      turnCount: 0,
      player: { ...INITIAL_PLAYER_STATS },
      enemy: { ...INITIAL_ENEMY_STATS },
      lastDamage: null,
      isHitEffectActive: false,
      hitTarget: null,
    });
  },

  /**
   * Execute attack for current turn
   * Reduces target HP by attacker's ATK
   * Checks for battle end conditions
   */
  executeAttack: () => {
    const state = get();
    
    // Prevent attacks if battle is not in progress
    if (state.status !== 'in_progress') {
      return;
    }

    const { currentTurn, player, enemy } = state;

    if (currentTurn === 'player') {
      // Player attacks enemy
      const newEnemyHp = calculateDamage(player.atk, enemy.currentHp);
      
      set({
        enemy: { ...enemy, currentHp: newEnemyHp },
        lastDamage: { target: 'enemy', amount: player.atk },
        isHitEffectActive: true,
        hitTarget: 'enemy',
      });

      // Check if enemy is defeated
      if (newEnemyHp <= 0) {
        set({ status: 'victory' });
      }
    } else {
      // Enemy attacks player
      const newPlayerHp = calculateDamage(enemy.atk, player.currentHp);
      
      set({
        player: { ...player, currentHp: newPlayerHp },
        lastDamage: { target: 'player', amount: enemy.atk },
        isHitEffectActive: true,
        hitTarget: 'player',
      });

      // Check if player is defeated
      if (newPlayerHp <= 0) {
        set({ status: 'defeat' });
      }
    }
  },

  /**
   * Switch to next turn
   * Alternates between player and enemy
   */
  nextTurn: () => {
    const state = get();
    
    // Only switch turns if battle is in progress
    if (state.status !== 'in_progress') {
      return;
    }

    set({
      currentTurn: state.currentTurn === 'player' ? 'enemy' : 'player',
      turnCount: state.turnCount + 1,
      isHitEffectActive: false,
      hitTarget: null,
    });
  },

  /**
   * Set battle status with validation
   */
  setStatus: (status: BattleStatus) => {
    const currentStatus = get().status;
    const validNextStatuses = VALID_TRANSITIONS[currentStatus];

    // Validate transition
    if (!validNextStatuses.includes(status)) {
      console.warn(`Invalid battle status transition: ${currentStatus} -> ${status}`);
      return;
    }

    set({ status });
  },

  /**
   * Reset battle state to initial values
   */
  resetBattle: () => {
    set(initialBattleState);
  },

  /**
   * Set hit effect state
   */
  setHitEffect: (target: 'player' | 'enemy' | null) => {
    set({
      isHitEffectActive: target !== null,
      hitTarget: target,
    });
  },
}));
