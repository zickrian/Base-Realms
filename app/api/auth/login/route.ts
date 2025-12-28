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
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

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

      user = newUser;

      // Create player profile
      await supabaseAdmin
        .from('player_profiles')
        .insert({
          user_id: user.id,
          level: 1,
          current_xp: 0,
          max_xp: 100,
        });

      // Create user settings
      await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: user.id,
          sound_volume: 50,
          notifications_enabled: true,
        });

      // Create daily packs record
      await supabaseAdmin
        .from('daily_packs')
        .insert({
          user_id: user.id,
          pack_count: 4,
          next_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      // Create daily quests
      const { data: questTemplates } = await supabaseAdmin
        .from('quest_templates')
        .select('id, target_value')
        .eq('is_daily', true)
        .eq('is_active', true);

      if (questTemplates && questTemplates.length > 0) {
        const userQuests = questTemplates.map(template => ({
          user_id: user.id,
          quest_template_id: template.id,
          current_progress: 0,
          max_progress: template.target_value,
          status: 'active' as const,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }));

        await supabaseAdmin
          .from('user_quests')
          .insert(userQuests);
      }
    } else if (userError) {
      throw userError;
    } else {
      // Update last login
      await supabaseAdmin
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to login' },
      { status: 500 }
    );
  }
}

