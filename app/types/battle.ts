/**
 * Battle Arena RPG Types
 * Defines all types and interfaces for the turn-based battle system
 */

// Character stats interface
export interface CharacterStats {
  name: string;
  currentHp: number;
  maxHp: number;
  atk: number;
}

// Battle status type
export type BattleStatus = 'loading' | 'ready' | 'in_progress' | 'victory' | 'defeat';

// Last damage info
export interface LastDamage {
  target: 'player' | 'enemy';
  amount: number;
}

// Battle state interface
export interface BattleState {
  status: BattleStatus;
  currentTurn: 'player' | 'enemy';
  turnCount: number;
  player: CharacterStats;
  enemy: CharacterStats;
  lastDamage: LastDamage | null;
  isHitEffectActive: boolean;
  hitTarget: 'player' | 'enemy' | null;
  playerImageUrl: string | null;
  playerTokenId: number | null; // NFT token ID for player character
}

// Selected card interface for battle initialization
export interface SelectedCardForBattle {
  atk: number;
  health: number;
  name: string;
  rarity: string;
  token_id?: number | null; // NFT token ID for CharForBattle image mapping
  image_url?: string | null; // Optional IPFS URL (not used in battle)
}

// Initial player stats (ATK: 100, HP: 500)
export const INITIAL_PLAYER_STATS: CharacterStats = {
  name: 'Player',
  currentHp: 500,
  maxHp: 500,
  atk: 100,
};

// Initial enemy stats (ATK: 80, HP: 500)
export const INITIAL_ENEMY_STATS: CharacterStats = {
  name: 'Enemy',
  currentHp: 500,
  maxHp: 500,
  atk: 80,
};

// Battle store actions interface
export interface BattleActions {
  initBattle: (selectedCard?: SelectedCardForBattle) => void;
  executeAttack: () => void;
  nextTurn: () => void;
  setStatus: (status: BattleStatus) => void;
  resetBattle: () => void;
  setHitEffect: (target: 'player' | 'enemy' | null) => void;
}

// Combined battle store type
export type BattleStore = BattleState & BattleActions;

// Valid state transitions for error handling
export const VALID_TRANSITIONS: Record<BattleStatus, BattleStatus[]> = {
  'loading': ['ready'],
  'ready': ['in_progress'],
  'in_progress': ['victory', 'defeat'],
  'victory': ['loading'],
  'defeat': ['loading'],
};
