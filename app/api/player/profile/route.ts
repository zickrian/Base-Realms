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
      .select(`
        *,
        stages(id, name, stage_number)
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Calculate XP percentage
    const xpPercentage = profile.max_xp > 0 
      ? (profile.current_xp / profile.max_xp) * 100 
      : 0;

    return NextResponse.json({
      profile: {
        ...profile,
        xpPercentage: Math.round(xpPercentage * 100) / 100,
        stage: profile.stages,
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

