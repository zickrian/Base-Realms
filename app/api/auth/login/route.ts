import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Find or create user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    let currentUser = user;

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          wallet_address: walletAddress.toLowerCase(),
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      currentUser = newUser;

      // Create player profile
      await supabaseAdmin
        .from('player_profiles')
        .insert({
          user_id: currentUser.id,
          level: 1,
          current_xp: 0,
          max_xp: 100,
        });

      // Create user settings
      await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: currentUser.id,
          sound_volume: 50,
          notifications_enabled: true,
        });

      // Create daily packs record
      await supabaseAdmin
        .from('daily_packs')
        .insert({
          user_id: currentUser.id,
          pack_count: 4,
          next_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      // Calculate tomorrow midnight UTC for expires_at
      const nowForNewUser = new Date();
      const todayStartForNewUser = new Date(Date.UTC(nowForNewUser.getUTCFullYear(), nowForNewUser.getUTCMonth(), nowForNewUser.getUTCDate()));
      const tomorrowMidnightForNewUser = new Date(todayStartForNewUser);
      tomorrowMidnightForNewUser.setUTCDate(tomorrowMidnightForNewUser.getUTCDate() + 1);

      // Create daily quests
      const { data: questTemplates } = await supabaseAdmin
        .from('quest_templates')
        .select('id, target_value, quest_type')
        .eq('is_daily', true)
        .eq('is_active', true);

      if (questTemplates && questTemplates.length > 0) {
        const userQuests = questTemplates.map(template => {
          // Auto-complete daily_login quest for new users
          const isDailyLogin = template.quest_type === 'daily_login';
          const progress = isDailyLogin ? template.target_value : 0;
          const status = isDailyLogin ? 'completed' as const : 'active' as const;
          
          return {
            user_id: currentUser.id,
            quest_template_id: template.id,
            current_progress: progress,
            max_progress: template.target_value,
            status,
            completed_at: isDailyLogin ? nowForNewUser.toISOString() : null,
            expires_at: tomorrowMidnightForNewUser.toISOString(), // Set to tomorrow midnight UTC
          };
        });

        await supabaseAdmin
          .from('user_quests')
          .insert(userQuests);
      }
    } else if (userError) {
      throw userError;
    } else {
      // Update last login
      const now = new Date();
      // Use UTC to avoid timezone issues
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const lastLogin = currentUser.last_login_at ? new Date(currentUser.last_login_at) : null;
      // Check if last login was before today (in UTC)
      const isFirstLoginToday = !lastLogin || lastLogin < todayStart;

      await supabaseAdmin
        .from('users')
        .update({ last_login_at: now.toISOString() })
        .eq('id', currentUser.id);

      // Calculate tomorrow midnight UTC for expires_at
      const tomorrowMidnight = new Date(todayStart);
      tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1);

      // Get daily quest template IDs first
      const { data: dailyQuestTemplates } = await supabaseAdmin
        .from('quest_templates')
        .select('id')
        .eq('is_daily', true);

      const dailyQuestTemplateIds = dailyQuestTemplates?.map(t => t.id) || [];

      // Delete expired daily quests (expires_at <= now, meaning they have already expired)
      // This includes ALL quests from previous days (active, completed, claimed)
      if (dailyQuestTemplateIds.length > 0) {
        await supabaseAdmin
          .from('user_quests')
          .delete()
          .eq('user_id', currentUser.id)
          .lte('expires_at', now.toISOString())
          .in('quest_template_id', dailyQuestTemplateIds);
      }

      // Check if user has ANY daily quests that are still valid (expires_at > now)
      // This prevents creating duplicate quests
      const { data: existingQuests } = await supabaseAdmin
        .from('user_quests')
        .select('id, quest_template_id, status, quest_templates!inner(quest_type, is_daily)')
        .eq('user_id', currentUser.id)
        .eq('quest_templates.is_daily', true)
        .gt('expires_at', now.toISOString());

      // If no daily quests for today at all, create them
      if (!existingQuests || existingQuests.length === 0) {
        const { data: questTemplates } = await supabaseAdmin
          .from('quest_templates')
          .select('id, target_value, quest_type')
          .eq('is_daily', true)
          .eq('is_active', true);

        if (questTemplates && questTemplates.length > 0) {
          const userQuests = questTemplates.map(template => {
            // Auto-complete daily_login quest ONLY on first login of the day
            const isDailyLogin = template.quest_type === 'daily_login';
            const shouldComplete = isDailyLogin && isFirstLoginToday;
            const progress = shouldComplete ? template.target_value : 0;
            const status = shouldComplete ? 'completed' as const : 'active' as const;
            
            return {
              user_id: currentUser.id,
              quest_template_id: template.id,
              current_progress: progress,
              max_progress: template.target_value,
              status,
              completed_at: shouldComplete ? now.toISOString() : null,
              expires_at: tomorrowMidnight.toISOString(),
            };
          });

          await supabaseAdmin
            .from('user_quests')
            .insert(userQuests);
        }
      } else if (isFirstLoginToday) {
        // Quests exist for today, check if we need to complete daily_login
        // But ONLY if it's still in 'active' status (not completed or claimed)
        const { data: dailyLoginTemplate } = await supabaseAdmin
          .from('quest_templates')
          .select('id, target_value')
          .eq('quest_type', 'daily_login')
          .eq('is_active', true)
          .single();

        if (dailyLoginTemplate) {
          // Find if there's an active (not completed, not claimed) daily_login quest for today
          const activeDailyLogin = existingQuests.find(
            q => q.quest_template_id === dailyLoginTemplate.id && q.status === 'active'
          );

          // ONLY complete if it's still active (not already completed or claimed)
          if (activeDailyLogin) {
            await supabaseAdmin
              .from('user_quests')
              .update({
                current_progress: dailyLoginTemplate.target_value,
                status: 'completed',
                completed_at: now.toISOString(),
              })
              .eq('id', activeDailyLogin.id);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: currentUser.id,
        wallet_address: currentUser.wallet_address,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to login';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

