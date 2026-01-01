import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

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

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
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
    
    // Get daily quest template IDs
    const { data: dailyQuestTemplates } = await supabaseAdmin
      .from('quest_templates')
      .select('id')
      .eq('is_daily', true);

    const dailyQuestTemplateIds = dailyQuestTemplates?.map(t => t.id) || [];

    // Delete expired daily quests (expires_at < today start)
    if (dailyQuestTemplateIds.length > 0) {
      await supabaseAdmin
        .from('user_quests')
        .delete()
        .eq('user_id', user.id)
        .lt('expires_at', todayStart.toISOString())
        .in('quest_template_id', dailyQuestTemplateIds);
    }

    // Check if user has ANY daily quests for today (including claimed ones)
    const { data: existingQuests } = await supabaseAdmin
      .from('user_quests')
      .select('id, quest_template_id, status, quest_templates!inner(quest_type, is_daily)')
      .eq('user_id', user.id)
      .eq('quest_templates.is_daily', true)
      .gte('expires_at', todayStart.toISOString());

    // If no daily quests for today at all, create them (same as login)
    if (!existingQuests || existingQuests.length === 0) {
      const tomorrowMidnight = new Date(todayStart);
      tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1);

      const { data: allDailyTemplates } = await supabaseAdmin
        .from('quest_templates')
        .select('*')
        .eq('is_daily', true)
        .eq('is_active', true);

      if (allDailyTemplates && allDailyTemplates.length > 0) {
        const userQuests = allDailyTemplates.map(template => {
          // For daily_login, set progress to 1 and status to completed
          const isDailyLogin = template.quest_type === 'daily_login';
          return {
            user_id: user.id,
            quest_template_id: template.id,
            current_progress: isDailyLogin ? 1 : 0,
            max_progress: template.target_value,
            status: isDailyLogin ? 'completed' as const : 'active' as const,
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
    }

    // Get active and completed quests - select only needed fields for better performance
    // Query is optimized with indexes on user_id, status, and expires_at
    // IMPORTANT: Only show 'active' and 'completed' quests, NOT 'claimed' quests
    // Claimed quests should disappear from the list until next day
    // Also filter out expired quests (they should have been deleted, but just in case)
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
      .gte('expires_at', now.toISOString()) // Only show non-expired quests
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

    return NextResponse.json({ quests: formattedQuests });
  } catch (error: unknown) {
    console.error('Get quests error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get quests';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

