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

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address, username, created_at, last_login_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error: any) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get session' },
      { status: 500 }
    );
  }
}

