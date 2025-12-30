import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

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

    // Get player profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('player_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get stage separately if needed
    let stage = null;
    if (profile.current_stage_id) {
      const { data: stageData } = await supabaseAdmin
        .from('stages')
        .select('id, name, stage_number')
        .eq('id', profile.current_stage_id)
        .single();
      stage = stageData;
    }

    // Calculate XP percentage
    const xpPercentage = profile.max_xp > 0 
      ? (profile.current_xp / profile.max_xp) * 100 
      : 0;

    // Ensure current_xp is a number (handle null/undefined)
    const currentXp = Number(profile.current_xp) || 0;
    const maxXp = Number(profile.max_xp) || 100;
    const level = Number(profile.level) || 1;

    return NextResponse.json({
      profile: {
        level,
        currentXp, // This comes directly from current_xp in database
        maxXp, // This comes directly from max_xp in database
        xpPercentage: Math.round(xpPercentage * 100) / 100,
        totalBattles: profile.total_battles || 0,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
        stage: stage,
      },
    });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get profile';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

