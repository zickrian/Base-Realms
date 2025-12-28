import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { updateQuestProgress } from '@/app/lib/db/quest-progress';

export async function POST(request: NextRequest) {
  try {
    const { questType } = await request.json();
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!questType) {
      return NextResponse.json(
        { error: 'Quest type is required' },
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

    // Update quest progress and auto-claim if completed
    const result = await updateQuestProgress(
      user.id, 
      questType as 'play_games' | 'win_games' | 'open_packs' | 'daily_login', 
      1,
      true // auto-claim enabled
    );

    return NextResponse.json({
      success: true,
      message: 'Quest progress updated',
      questCompleted: result.completedQuestIds.length > 0,
      xpAwarded: result.xpAwarded,
      completedQuestIds: result.completedQuestIds,
    });
  } catch (error: any) {
    console.error('Update quest progress error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update quest progress' },
      { status: 500 }
    );
  }
}
