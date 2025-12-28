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

    // Claim reward
    const result = await claimQuestReward(user.id, questId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Claim quest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to claim quest reward' },
      { status: 500 }
    );
  }
}

