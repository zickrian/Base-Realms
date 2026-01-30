import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { 
  validateWalletHeader, 
  isInWhitelist, 
  sanitizeErrorMessage, 
  devLog 
} from '@/app/lib/validation';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { stageId, battleType = 'pve' } = body;
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Validate battleType whitelist
    if (!isInWhitelist(battleType, ['pve', 'pvp'])) {
      return NextResponse.json(
        { error: 'Invalid battle type' },
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
    }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.battles) });
  } catch (error: unknown) {
    devLog.error('Start battle error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to start battle') },
      { status: 500 }
    );
  }
}

