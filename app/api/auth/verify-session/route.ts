import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { isValidEthAddress } from '@/app/lib/validation';

/**
 * Verify if a wallet address has a valid authenticated session
 * Used to detect stale/cached wallet state in embedded contexts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { walletAddress } = body;

    if (!walletAddress || !isValidEthAddress(walletAddress)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Check if user exists and has recent activity
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address, last_login_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json({
        valid: false,
        reason: 'no_user',
      });
    }

    // Check if last login was recent (within 7 days)
    const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const isRecent = lastLogin && lastLogin > sevenDaysAgo;

    return NextResponse.json({
      valid: true,
      isRecent,
      userId: user.id,
    });
  } catch (error) {
    console.error('[Session Verify] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
