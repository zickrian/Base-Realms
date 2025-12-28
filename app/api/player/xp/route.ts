import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { awardXp } from '@/app/lib/db/xp-award';

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
  } catch (error: any) {
    console.error('Get XP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get XP' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { xpAmount } = await request.json();
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!xpAmount || xpAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid XP amount is required' },
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

    // Award XP
    const result = await awardXp(user.id, xpAmount);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Add XP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add XP' },
      { status: 500 }
    );
  }
}

