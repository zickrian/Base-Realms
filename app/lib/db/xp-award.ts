import { supabaseAdmin } from '../supabase/server';
import { calculateLevelFromXp } from './level-calculator';

/**
 * Award XP to a user and handle level up
 */
export async function awardXp(
  userId: string,
  xpAmount: number
): Promise<{ newLevel: number; currentXp: number; maxXp: number; leveledUp: boolean }> {
  // Get current profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('player_profiles')
    .select('level, current_xp, max_xp')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Player profile not found');
  }

  // Get level config to calculate total XP correctly
  const { data: currentLevelConfig } = await supabaseAdmin
    .from('level_config')
    .select('total_xp_required')
    .eq('level', profile.level)
    .single();

  // Calculate total XP: total_xp_required for current level + current_xp
  const baseXpForLevel = currentLevelConfig?.total_xp_required || ((profile.level - 1) * 100);
  const currentTotalXp = baseXpForLevel + profile.current_xp;
  const newTotalXp = currentTotalXp + xpAmount;

  // Calculate new level
  const levelInfo = await calculateLevelFromXp(newTotalXp);
  const leveledUp = levelInfo.level > profile.level;

  // Update profile
  const { error: updateError } = await supabaseAdmin
    .from('player_profiles')
    .update({
      level: levelInfo.level,
      current_xp: levelInfo.currentXp,
      max_xp: levelInfo.maxXp,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    throw new Error('Failed to update player profile');
  }

  return {
    newLevel: levelInfo.level,
    currentXp: levelInfo.currentXp,
    maxXp: levelInfo.maxXp,
    leveledUp,
  };
}

