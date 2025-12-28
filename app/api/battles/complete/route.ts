import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { awardXp } from '@/app/lib/db/xp-award';
import { updateQuestProgress } from '@/app/lib/db/quest-progress';

export async function POST(request: NextRequest) {
  try {
    const { battleId, result } = await request.json();
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!battleId || !result) {
      return NextResponse.json(
        { error: 'Battle ID and result are required' },
        { status: 400 }
      );
    }

    if (!['win', 'loss'].includes(result)) {
      return NextResponse.json(
        { error: 'Result must be win or loss' },
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

    // Get battle
    const { data: battle, error: battleError } = await supabaseAdmin
      .from('battles')
      .select('*')
      .eq('id', battleId)
      .eq('user_id', user.id)
      .single();

    if (battleError || !battle) {
      return NextResponse.json(
        { error: 'Battle not found' },
        { status: 404 }
      );
    }

    if (battle.result !== 'in_progress') {
      return NextResponse.json(
        { error: 'Battle already completed' },
        { status: 400 }
      );
    }

    // Calculate XP (win = 50 XP, loss = 10 XP)
    const xpGained = result === 'win' ? 50 : 10;

    // Award XP
    const xpResult = await awardXp(user.id, xpGained);

    // Update battle
    const { data: updatedBattle, error: updateError } = await supabaseAdmin
      .from('battles')
      .update({
        result,
        xp_gained: xpGained,
        completed_at: new Date().toISOString(),
      })
      .eq('id', battleId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Get current profile stats
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('player_profiles')
      .select('total_battles, wins, losses')
      .eq('user_id', user.id)
      .single();

    if (!profileError && profile) {
      // Update player stats
      const updateData: any = {
        total_battles: profile.total_battles + 1,
      };
      if (result === 'win') {
        updateData.wins = profile.wins + 1;
      } else {
        updateData.losses = profile.losses + 1;
      }

      await supabaseAdmin
        .from('player_profiles')
        .update(updateData)
        .eq('user_id', user.id);
    }

    // Update quest progress
    await updateQuestProgress(user.id, 'play_games', 1);
    if (result === 'win') {
      await updateQuestProgress(user.id, 'win_games', 1);
    }

    return NextResponse.json({
      success: true,
      battle: updatedBattle,
      xpAwarded: xpGained,
      levelUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
    });
  } catch (error: any) {
    console.error('Complete battle error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete battle' },
      { status: 500 }
    );
  }
}

