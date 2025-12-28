import { supabaseAdmin } from '../supabase/server';
import { awardXp } from './xp-award';

export type QuestType = 'play_games' | 'win_games' | 'open_packs' | 'daily_login';

/**
 * Update quest progress based on quest type
 */
export async function updateQuestProgress(
  userId: string,
  questType: QuestType,
  increment: number = 1
): Promise<void> {
  // Get active quests of this type
  const { data: quests, error } = await supabaseAdmin
    .from('user_quests')
    .select(`
      *,
      quest_templates!inner(quest_type, reward_xp, reward_gold, reward_card_pack_id)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('quest_templates.quest_type', questType);

  if (error || !quests || quests.length === 0) {
    return;
  }

  // Update each quest
  for (const quest of quests) {
    const newProgress = Math.min(quest.current_progress + increment, quest.max_progress);
    const isCompleted = newProgress >= quest.max_progress;

    const updateData: any = {
      current_progress: newProgress,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted && quest.status === 'active') {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from('user_quests')
      .update(updateData)
      .eq('id', quest.id);
  }
}

/**
 * Claim quest reward
 */
export async function claimQuestReward(
  userId: string,
  questId: string
): Promise<{ xpAwarded: number; goldAwarded: number | null; cardPackId: string | null }> {
  // Get quest with template
  const { data: quest, error: questError } = await supabaseAdmin
    .from('user_quests')
    .select(`
      *,
      quest_templates!inner(reward_xp, reward_gold, reward_card_pack_id)
    `)
    .eq('id', questId)
    .eq('user_id', userId)
    .single();

  if (questError || !quest) {
    throw new Error('Quest not found');
  }

  if (quest.status !== 'completed') {
    throw new Error('Quest is not completed');
  }

  const template = quest.quest_templates;
  let xpAwarded = 0;
  let goldAwarded = template.reward_gold;
  const cardPackId = template.reward_card_pack_id;

  // Award XP
  if (template.reward_xp > 0) {
    const result = await awardXp(userId, template.reward_xp);
    xpAwarded = template.reward_xp;
  }

  // TODO: Award gold if gold system is implemented
  // TODO: Add card pack to inventory if reward_card_pack_id exists

  // Mark quest as claimed
  await supabaseAdmin
    .from('user_quests')
    .update({
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    })
    .eq('id', questId);

  return {
    xpAwarded,
    goldAwarded,
    cardPackId,
  };
}

