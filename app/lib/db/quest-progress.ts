import { supabaseAdmin } from '../supabase/server';
import { awardXp } from './xp-award';

export type QuestType = 'play_games' | 'win_games' | 'open_packs' | 'daily_login';

// Types for database responses
interface QuestTemplate {
  quest_type: QuestType;
  reward_xp: number;
  reward_card_pack_id: string | null;
}

interface UserQuest {
  id: string;
  current_progress: number;
  max_progress: number;
  status: 'active' | 'completed' | 'claimed';
  quest_templates: QuestTemplate;
}

/**
 * Update quest progress based on quest type
 * Returns array of completed quest IDs that were auto-claimed
 * IMPORTANT: Only updates 'active' quests, not 'completed' or 'claimed' quests
 */
export async function updateQuestProgress(
  userId: string,
  questType: QuestType,
  increment: number = 1,
  autoClaim: boolean = false // Default to false - user must manually claim
): Promise<{ completedQuestIds: string[]; xpAwarded: number }> {
  // Get ONLY active quests of this type that haven't expired
  // Don't update completed or claimed quests
  const now = new Date();
  
  // Use gt (greater than) instead of gte to ensure quest hasn't expired yet
  // expires_at > now means the quest is still valid
  const { data: quests, error } = await supabaseAdmin
    .from('user_quests')
    .select(`
      *,
      quest_templates!inner(quest_type, reward_xp, reward_card_pack_id)
    `)
    .eq('user_id', userId)
    .eq('status', 'active') // ONLY active quests can be updated
    .eq('quest_templates.quest_type', questType)
    .gt('expires_at', now.toISOString()); // Only update quests that haven't expired (expires_at > now)

  if (error) {
    console.error(`[updateQuestProgress] Error fetching quests for user ${userId}, type ${questType}:`, error);
    return { completedQuestIds: [], xpAwarded: 0 };
  }

  if (!quests || quests.length === 0) {
    console.log(`[updateQuestProgress] No active quests found for user ${userId}, type ${questType}`);
    return { completedQuestIds: [], xpAwarded: 0 };
  }

  console.log(`[updateQuestProgress] Found ${quests.length} active quest(s) for user ${userId}, type ${questType}`);

  const completedQuestIds: string[] = [];
  let totalXpAwarded = 0;

  // Update each quest
  for (const quest of quests as UserQuest[]) {
    const oldProgress = quest.current_progress;
    const newProgress = Math.min(quest.current_progress + increment, quest.max_progress);
    const isCompleted = newProgress >= quest.max_progress;

    console.log(`[updateQuestProgress] Updating quest ${quest.id}: ${oldProgress}/${quest.max_progress} -> ${newProgress}/${quest.max_progress}`);

    const updateData: {
      current_progress: number;
      status?: 'completed' | 'claimed';
      completed_at?: string;
      claimed_at?: string;
    } = {
      current_progress: newProgress,
    };

    if (isCompleted && quest.status === 'active') {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
      completedQuestIds.push(quest.id);
      console.log(`[updateQuestProgress] Quest ${quest.id} completed!`);

      // Auto-claim if enabled
      if (autoClaim) {
        const template = quest.quest_templates;
        
        // Award XP
        if (template.reward_xp > 0) {
          await awardXp(userId, template.reward_xp);
          totalXpAwarded += template.reward_xp;
          console.log(`[updateQuestProgress] Auto-claimed quest ${quest.id}, awarded ${template.reward_xp} XP`);
        }

        // TODO: Add card pack to inventory if reward_card_pack_id exists

        // Mark quest as claimed
        updateData.status = 'claimed';
        updateData.claimed_at = new Date().toISOString();
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_quests')
      .update(updateData)
      .eq('id', quest.id);

    if (updateError) {
      console.error(`[updateQuestProgress] Error updating quest ${quest.id}:`, updateError);
    } else {
      console.log(`[updateQuestProgress] Successfully updated quest ${quest.id}`);
    }
  }

  return { completedQuestIds, xpAwarded: totalXpAwarded };
}

/**
 * Claim quest reward
 */
export async function claimQuestReward(
  userId: string,
  questId: string
): Promise<{ xpAwarded: number; cardPackId: string | null }> {
  // Get quest with template
  const { data: quest, error: questError } = await supabaseAdmin
    .from('user_quests')
    .select(`
      *,
      quest_templates!inner(reward_xp, reward_card_pack_id)
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
  const cardPackId = template.reward_card_pack_id;

  // Award XP
  if (template.reward_xp > 0) {
    await awardXp(userId, template.reward_xp);
    xpAwarded = template.reward_xp;
  }

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
    cardPackId,
  };
}

