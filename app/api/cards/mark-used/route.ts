/**
 * Mark NFT as Used API Route
 * 
 * Called after successful battle to mark NFT as used (locked)
 * This prevents the NFT from being used in future battles
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { 
  validateWalletHeader, 
  isNonNegativeInteger, 
  sanitizeErrorMessage, 
  devLog 
} from '@/app/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { tokenId } = body;

    // Validate tokenId is a non-negative integer
    if (!isNonNegativeInteger(tokenId)) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      );
    }

    devLog.log('[mark-used] Processing request for tokenId:', tokenId);

    // Get user ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletValidation.address)
      .single();

    if (userError || !user) {
      devLog.error('[mark-used] User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get inventory row first to check existence
    const { data: inventoryRows, error: checkError } = await supabaseAdmin
      .from('user_inventory')
      .select(`
        id,
        used,
        card_templates!inner(
          id,
          token_id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('card_templates.token_id', tokenId);

    if (checkError) {
      devLog.error('[mark-used] Error checking inventory:', checkError);
      return NextResponse.json(
        { error: 'Failed to check inventory' },
        { status: 500 }
      );
    }

    // Validate row exists
    if (!inventoryRows || inventoryRows.length === 0) {
      return NextResponse.json(
        { 
          error: 'NFT not found in inventory',
          details: 'This NFT may not be synced to database yet. Try refreshing your inventory.',
        },
        { status: 404 }
      );
    }

    const inventoryRow = inventoryRows[0];

    // Check if already used
    if (inventoryRow.used) {
      return NextResponse.json(
        { 
          success: true,
          message: 'NFT already marked as used',
          alreadyUsed: true,
        }
      );
    }

    // Mark NFT as used
    const { error: updateError } = await supabaseAdmin
      .from('user_inventory')
      .update({ 
        used: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventoryRow.id)
      .select(`
        id,
        used,
        updated_at,
        card_templates!inner(
          id,
          token_id,
          name
        )
      `)
      .single();

    if (updateError) {
      devLog.error('[mark-used] Error updating inventory:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark NFT as used' },
        { status: 500 }
      );
    }

    devLog.log('[mark-used] Success');

    return NextResponse.json({
      success: true,
      message: 'NFT marked as used',
    });

  } catch (error: unknown) {
    devLog.error('[mark-used] Fatal error:', error);
    
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Internal server error') },
      { status: 500 }
    );
  }
}
