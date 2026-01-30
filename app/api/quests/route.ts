import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { validateWalletHeader, sanitizeErrorMessage, devLog } from '@/app/lib/validation';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

interface QuestData {
  id: string;
  current_progress: number;
  max_progress: number;
  status: string;
  quest_templates: {
    title: string;
    description: string;
    quest_type: string;
    reward_xp: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletValidation.address)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check and reset expired daily quests (same logic as login)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // Tomorrow midnight is when today's quests should expire
    const tomorrowMidnight = new Date(todayStart);
    tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1);
    
    // Get daily quest template IDs
    const { data: dailyQuestTemplates } = await supabaseAdmin
      .from('quest_templates')
      .select('id')
      .eq('is_daily', true);

    const dailyQuestTemplateIds = dailyQuestTemplates?.map(t => t.id) || [];

    // Delete expired daily quests (expires_at <= now, meaning they have already expired)
    if (dailyQuestTemplateIds.length > 0) {
      await supabaseAdmin
        .from('user_quests')
        .delete()
        .eq('user_id', user.id)
        .lte('expires_at', now.toISOString())
        .in('quest_template_id', dailyQuestTemplateIds);
    }

    // Check if user has ANY daily quests that are still valid (expires_at > now)
    const { data: existingQuests } = await supabaseAdmin
      .from('user_quests')
      .select('id, quest_template_id, status, quest_templates!inner(quest_type, is_daily)')
      .eq('user_id', user.id)
      .eq('quest_templates.is_daily', true)
      .gt('expires_at', now.toISOString());

    // If no valid daily quests, create new ones for today
    if (!existingQuests || existingQuests.length === 0) {

      const { data: allDailyTemplates } = await supabaseAdmin
        .from('quest_templates')
        .select('*')
        .eq('is_daily', true)
        .eq('is_active', true);

      if (allDailyTemplates && allDailyTemplates.length > 0) {
        const userQuests = allDailyTemplates.map(template => {
          // For daily_login, set progress to target_value (1) and status to completed
          // This is because accessing quests means user has logged in today
          const isDailyLogin = template.quest_type === 'daily_login';
          const progress = isDailyLogin ? template.target_value : 0;
          const status = isDailyLogin ? 'completed' as const : 'active' as const;
          
          return {
            user_id: user.id,
            quest_template_id: template.id,
            current_progress: progress,
            max_progress: template.target_value,
            status,
            started_at: now.toISOString(),
            completed_at: isDailyLogin ? now.toISOString() : null,
            expires_at: tomorrowMidnight.toISOString(),
          };
        });

        if (userQuests.length > 0) {
          await supabaseAdmin
            .from('user_quests')
            .insert(userQuests);
        }
      }
    } else {
      // Quests exist, but check if daily_login is still active (not completed)
      // This handles the case where quests were created but daily_login wasn't completed
      const dailyLoginQuest = existingQuests.find(
        q => {
          // quest_templates can be an array or object depending on Supabase response
          const template = Array.isArray(q.quest_templates) 
            ? q.quest_templates[0] 
            : q.quest_templates;
          return template?.quest_type === 'daily_login' && q.status === 'active';
        }
      );

      if (dailyLoginQuest) {
        // Complete the daily_login quest since user is accessing quests (means they logged in)
        await supabaseAdmin
          .from('user_quests')
          .update({
            current_progress: 1,
            status: 'completed',
            completed_at: now.toISOString(),
          })
          .eq('id', dailyLoginQuest.id);
      }
    }

    // Get active and completed quests - select only needed fields for better performance
    // Query is optimized with indexes on user_id, status, and expires_at
    // IMPORTANT: Only show 'active' and 'completed' quests, NOT 'claimed' quests
    // Claimed quests should disappear from the list until next day
    // Also filter out expired quests (expires_at must be > now)
    const { data: quests, error: questsError } = await supabaseAdmin
      .from('user_quests')
      .select(`
        id,
        current_progress,
        max_progress,
        status,
        expires_at,
        quest_templates!inner(
          title,
          description,
          quest_type,
          reward_xp
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['active', 'completed']) // Don't show claimed quests
      .gt('expires_at', now.toISOString()) // Only show non-expired quests (expires_at > now)
      .order('started_at', { ascending: false })
      .limit(20); // Limit to prevent excessive data (daily quests are typically 4-5)

    if (questsError) {
      throw questsError;
    }

    // Format quests for frontend
    // Note: Supabase returns quest_templates as an object (not array) when using !inner
    const formattedQuests = (quests || []).map((quest: unknown) => {
      const q = quest as QuestData;
      const template = Array.isArray(q.quest_templates) ? q.quest_templates[0] : q.quest_templates;
      return {
        id: q.id,
        title: template?.title || '',
        description: template?.description || '',
        currentProgress: q.current_progress,
        maxProgress: q.max_progress,
        reward: template?.reward_xp 
          ? `${template.reward_xp} XP`
          : '',
        status: q.status,
        questType: template?.quest_type || '',
      };
    });

    return NextResponse.json({ quests: formattedQuests }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.quests) });
  } catch (error: unknown) {
    devLog.error('Get quests error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to get quests') },
      { status: 500 }
    );
  }
}

