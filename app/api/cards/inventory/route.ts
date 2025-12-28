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

    // Get inventory with card templates
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select(`
        *,
        card_templates(*)
      `)
      .eq('user_id', user.id)
      .order('acquired_at', { ascending: false });

    if (inventoryError) {
      throw inventoryError;
    }

    return NextResponse.json({ inventory: inventory || [] });
  } catch (error: any) {
    console.error('Get inventory error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get inventory' },
      { status: 500 }
    );
  }
}

