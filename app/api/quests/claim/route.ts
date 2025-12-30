import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { claimQuestReward } from '@/app/lib/db/quest-progress';

export async function POST(request: NextRequest) {
  try {
    const { questId } = await request.json();
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!questId) {
      return NextResponse.json(
        { error: 'Quest ID is required' },
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

    // Claim reward - this updates XP in database
    const result = await claimQuestReward(user.id, questId);

    // Get updated profile for realtime XP update
    const { data: profile } = await supabaseAdmin
      .from('player_profiles')
      .select('level, current_xp, max_xp')
      .eq('user_id', user.id)
      .single();

    const xpPercentage = profile && profile.max_xp > 0 
      ? (profile.current_xp / profile.max_xp) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      xpAwarded: result.xpAwarded,
      cardPackId: result.cardPackId,
      // Include updated profile for realtime UI update
      profile: profile ? {
        level: profile.level,
        currentXp: profile.current_xp,
        maxXp: profile.max_xp,
        xpPercentage: Math.round(xpPercentage * 100) / 100,
      } : null,
    });
  } catch (error: unknown) {
    console.error('Claim quest error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to claim quest reward';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

