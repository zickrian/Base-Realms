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
      const updateData: Record<string, number> = {
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

    // Update quest progress (no auto-claim for battle quests, user can claim manually)
    // Always update play_games quest
    const playGamesResult = await updateQuestProgress(user.id, 'play_games', 1, false);
    
    // Update win_games quest only if result is win
    let winGamesResult = { completedQuestIds: [], xpAwarded: 0 };
    if (result === 'win') {
      winGamesResult = await updateQuestProgress(user.id, 'win_games', 1, false);
    }

    // Log quest updates for debugging
    console.log(`[Battle Complete] User ${user.id}, Result: ${result}`);
    console.log(`[Quest Progress] play_games - Completed: ${playGamesResult.completedQuestIds.length > 0}`);
    if (result === 'win') {
      console.log(`[Quest Progress] win_games - Completed: ${winGamesResult.completedQuestIds.length > 0}`);
    }

    return NextResponse.json({
      success: true,
      battle: updatedBattle,
      xpAwarded: xpGained,
      levelUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
      questUpdated: {
        playGames: playGamesResult.completedQuestIds.length > 0,
        winGames: result === 'win' ? winGamesResult.completedQuestIds.length > 0 : false,
      },
    });
  } catch (error: unknown) {
    console.error('Complete battle error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete battle';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

