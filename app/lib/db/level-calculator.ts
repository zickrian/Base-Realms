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

  // Find the level where totalXpRequired <= totalXp
  let currentLevel = 1;
  let totalXpRequired = 0;
  
  for (const config of levelConfigs) {
    if (config.total_xp_required <= totalXp) {
      currentLevel = config.level;
      totalXpRequired = config.total_xp_required;
      break;
    }
  }

  // Get max XP for current level
  const currentLevelConfig = levelConfigs.find(lc => lc.level === currentLevel);
  const nextLevelConfig = levelConfigs.find(lc => lc.level === currentLevel + 1);

  const maxXp = nextLevelConfig?.total_xp_required || (currentLevel * 100);
  const currentXp = totalXp - totalXpRequired;
  const xpForNextLevel = maxXp - totalXp;

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

