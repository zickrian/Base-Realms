import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { stageId, battleType = 'pve' } = await request.json();
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

    // Create battle
    const { data: battle, error: battleError } = await supabaseAdmin
      .from('battles')
      .insert({
        user_id: user.id,
        stage_id: stageId || null,
        battle_type: battleType,
        result: 'in_progress',
      })
      .select()
      .single();

    if (battleError) {
      throw battleError;
    }

    return NextResponse.json({
      success: true,
      battle,
    });
  } catch (error: any) {
    console.error('Start battle error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start battle' },
      { status: 500 }
    );
  }
}

