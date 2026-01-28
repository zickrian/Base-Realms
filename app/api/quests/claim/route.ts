import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { claimQuestReward } from '@/app/lib/db/quest-progress';
import { validateWalletHeader, isValidUUID, sanitizeErrorMessage, devLog } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { questId } = body;
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Validate questId format
    if (!questId || !isValidUUID(questId)) {
      return NextResponse.json(
        { error: 'Valid quest ID is required' },
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

    // Claim reward
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
      profile: profile ? {
        level: profile.level,
        currentXp: profile.current_xp,
        maxXp: profile.max_xp,
        xpPercentage: Math.round(xpPercentage * 100) / 100,
      } : null,
    });
  } catch (error: unknown) {
    devLog.error('Claim quest error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to claim quest reward') },
      { status: 500 }
    );
  }
}

