import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Profile API Called ===');
    const walletAddress = request.headers.get('x-wallet-address');
    console.log('Wallet address from header:', walletAddress);

    if (!walletAddress) {
      console.error('No wallet address provided');
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user
    console.log('Looking for user with wallet:', walletAddress.toLowerCase());
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    console.log('User query result:', { user, userError });

    if (userError) {
      console.error('User query error:', userError);
      return NextResponse.json(
        { error: `User not found: ${userError.message}` },
        { status: 404 }
      );
    }

    if (!user) {
      console.error('User is null');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('Found user:', user.id);

    // Get player profile - query without join first to avoid issues
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('player_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (profileError) {
      console.error('Profile query error:', profileError);
      return NextResponse.json(
        { error: `Profile not found: ${profileError.message}` },
        { status: 404 }
      );
    }

    if (!profile) {
      console.error('Profile is null');
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

    console.log('Profile API - Raw data from DB:', {
      current_xp: profile.current_xp,
      max_xp: profile.max_xp,
      level: profile.level,
      calculated: { currentXp, maxXp, level, xpPercentage }
    });

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
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get profile' },
      { status: 500 }
    );
  }
}

