/**
 * Mark NFT as Used API Route
 * 
 * Called after successful battle to mark NFT as used (locked)
 * This prevents the NFT from being used in future battles
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId && tokenId !== 0) {
      return NextResponse.json(
        { error: 'Token ID required' },
        { status: 400 }
      );
    }

    console.log('[API] Marking NFT as used:', { walletAddress, tokenId });

    // Get user ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (userError || !user) {
      console.error('[API] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Mark NFT as used
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('user_inventory')
      .update({ 
        used: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('token_id', tokenId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error marking NFT as used:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark NFT as used' },
        { status: 500 }
      );
    }

    if (!updated) {
      console.error('[API] NFT not found in inventory');
      return NextResponse.json(
        { error: 'NFT not found in inventory' },
        { status: 404 }
      );
    }

    console.log('[API] NFT marked as used successfully:', updated);

    return NextResponse.json({
      success: true,
      message: 'NFT marked as used',
      inventory: updated,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error in mark-used route:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
