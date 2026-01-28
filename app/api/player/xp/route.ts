import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { awardXp } from '@/app/lib/db/xp-award';
import { validateWalletHeader, isPositiveInteger, sanitizeErrorMessage, devLog } from '@/app/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
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

    // Get player profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('player_profiles')
      .select('level, current_xp, max_xp')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const xpPercentage = profile.max_xp > 0 
      ? (profile.current_xp / profile.max_xp) * 100 
      : 0;

    return NextResponse.json({
      level: profile.level,
      currentXp: profile.current_xp,
      maxXp: profile.max_xp,
      xpPercentage: Math.round(xpPercentage * 100) / 100,
    });
  } catch (error: unknown) {
    devLog.error('Get XP error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to get XP') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { xpAmount } = body;
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Validate XP amount is a positive integer
    if (!isPositiveInteger(xpAmount)) {
      return NextResponse.json(
        { error: 'Valid XP amount is required' },
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

    // Award XP
    const result = await awardXp(user.id, xpAmount);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    devLog.error('Add XP error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to add XP') },
      { status: 500 }
    );
  }
}

