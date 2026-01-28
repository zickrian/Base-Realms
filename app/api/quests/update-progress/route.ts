import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { updateQuestProgress } from '@/app/lib/db/quest-progress';
import { validateWalletHeader, isInWhitelist, sanitizeErrorMessage, devLog } from '@/app/lib/validation';

const VALID_QUEST_TYPES = ['play_games', 'win_games', 'open_packs', 'daily_login', 'mint_nft'] as const;

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { questType, autoClaim = false } = body;
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Validate questType whitelist
    if (!isInWhitelist(questType, [...VALID_QUEST_TYPES])) {
      return NextResponse.json(
        { error: 'Invalid quest type' },
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

    // Update quest progress
    const result = await updateQuestProgress(
      user.id, 
      questType as typeof VALID_QUEST_TYPES[number], 
      1,
      autoClaim
    );

    return NextResponse.json({
      success: true,
      message: 'Quest progress updated',
      questCompleted: result.completedQuestIds.length > 0,
      xpAwarded: result.xpAwarded,
      completedQuestIds: result.completedQuestIds,
    });
  } catch (error: unknown) {
    devLog.error('Update quest progress error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to update quest progress') },
      { status: 500 }
    );
  }
}
