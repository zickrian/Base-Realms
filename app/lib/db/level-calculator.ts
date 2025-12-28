import { supabaseAdmin } from '../supabase/server';

export interface LevelInfo {
  level: number;
  currentXp: number;
  maxXp: number;
  totalXpRequired: number;
  xpForNextLevel: number;
}

/**
 * Calculate level from total XP
 */
export async function calculateLevelFromXp(totalXp: number): Promise<LevelInfo> {
  const { data: levelConfigs, error } = await supabaseAdmin
    .from('level_config')
    .select('*')
    .order('level', { ascending: false });

  if (error || !levelConfigs || levelConfigs.length === 0) {
    // Fallback: simple calculation if database fails
    const level = Math.floor(totalXp / 100) + 1;
    const maxXp = level * 100;
    return {
      level,
      currentXp: totalXp % 100,
      maxXp,
      totalXpRequired: (level - 1) * 100,
      xpForNextLevel: maxXp - totalXp,
    };
  }

  // Sort by level ascending to find correct level
  const sortedConfigs = [...levelConfigs].sort((a, b) => a.level - b.level);
  
  // Find the level where totalXpRequired <= totalXp
  let currentLevel = 1;
  let baseXpForLevel = 0; // Base XP required to reach this level
  let maxXpForLevel = 100; // XP needed to complete this level (always 100 per level)
  
  for (let i = 0; i < sortedConfigs.length; i++) {
    const config = sortedConfigs[i];
    const nextConfig = sortedConfigs[i + 1];
    
    // Check if totalXp is at or above this level's base XP
    if (totalXp >= config.total_xp_required) {
      currentLevel = config.level;
      baseXpForLevel = config.total_xp_required;
      
      // Max XP for current level is always 100 (required_xp)
      maxXpForLevel = config.required_xp;
    } else {
      break;
    }
  }

  // Calculate current XP within the level (totalXp - base XP for this level)
  const currentXp = totalXp - baseXpForLevel;
  // Max XP is always 100 per level
  const maxXp = maxXpForLevel;
  const xpForNextLevel = maxXp - currentXp;

  return {
    level: currentLevel,
    currentXp,
    maxXp,
    totalXpRequired,
    xpForNextLevel,
  };
}

/**
 * Get max XP for a specific level
 */
export async function getMaxXpForLevel(level: number): Promise<number> {
  const { data: nextLevelConfig } = await supabaseAdmin
    .from('level_config')
    .select('total_xp_required')
    .eq('level', level + 1)
    .single();

  if (nextLevelConfig) {
    return nextLevelConfig.total_xp_required;
  }

  // Fallback
  return level * 100;
}

