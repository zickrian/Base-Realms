/**
 * Mark NFT as Used API Route
 * 
 * Called after successful battle to mark NFT as used (locked)
 * This prevents the NFT from being used in future battles
 * 
 * PHASE 0 ENHANCEMENT: Comprehensive logging for debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      console.error('[mark-used] ❌ Missing wallet address header');
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tokenId, battleTxHash } = body;

    if (!tokenId && tokenId !== 0) {
      console.error('[mark-used] ❌ Missing tokenId in request body');
      return NextResponse.json(
        { error: 'Token ID required' },
        { status: 400 }
      );
    }

    // PHASE 0: Comprehensive logging
    console.log('[mark-used] 🎯 REQUEST:', {
      walletAddress: walletAddress.toLowerCase(),
      tokenId,
      battleTxHash: battleTxHash || 'not provided',
      timestamp: new Date().toISOString(),
    });

    // Get user ID
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (userError || !user) {
      console.error('[mark-used] ❌ User not found:', {
        walletAddress: walletAddress.toLowerCase(),
        error: userError,
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[mark-used] ✓ User found:', {
      userId: user.id,
      walletAddress: walletAddress.toLowerCase(),
    });

    // PHASE 4 FIX: Get inventory row first to check existence
    // This prevents .single() error if row doesn't exist
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
      console.error('[mark-used] ❌ Error checking inventory:', {
        error: checkError,
        userId: user.id,
        tokenId,
      });
      return NextResponse.json(
        { error: 'Failed to check inventory' },
        { status: 500 }
      );
    }

    // PHASE 3: Validate row exists (from sync-nft)
    if (!inventoryRows || inventoryRows.length === 0) {
      console.error('[mark-used] ❌ NFT NOT FOUND in inventory:', {
        userId: user.id,
        tokenId,
        walletAddress: walletAddress.toLowerCase(),
        message: 'Row does not exist - possible sync issue',
      });
      return NextResponse.json(
        { 
          error: 'NFT not found in inventory',
          details: 'This NFT may not be synced to database yet. Try refreshing your inventory.',
        },
        { status: 404 }
      );
    }

    const inventoryRow = inventoryRows[0];
    
    console.log('[mark-used] ✓ Inventory row found:', {
      inventoryId: inventoryRow.id,
      currentUsedStatus: inventoryRow.used,
      tokenId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nftName: (inventoryRow as any).card_templates?.name,
    });

    // Check if already used
    if (inventoryRow.used) {
      console.warn('[mark-used] ⚠️ NFT already marked as used:', {
        inventoryId: inventoryRow.id,
        tokenId,
      });
      return NextResponse.json(
        { 
          success: true,
          message: 'NFT already marked as used',
          inventory: inventoryRow,
          alreadyUsed: true,
        }
      );
    }

    // PHASE 4: Mark NFT as used with proper UPDATE query
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('user_inventory')
      .update({ 
        used: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventoryRow.id) // Use ID directly, more reliable
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
      console.error('[mark-used] ❌ Error updating inventory:', {
        error: updateError,
        inventoryId: inventoryRow.id,
        tokenId,
      });
      return NextResponse.json(
        { error: 'Failed to mark NFT as used', details: updateError.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    
    console.log('[mark-used] ✅ SUCCESS:', {
      inventoryId: updated.id,
      tokenId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nftName: (updated as any).card_templates?.name,
      used: updated.used,
      updatedAt: updated.updated_at,
      battleTxHash: battleTxHash || 'not provided',
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      message: 'NFT marked as used',
      inventory: updated,
      duration: `${duration}ms`,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;
    
    console.error('[mark-used] ❌ FATAL ERROR:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
    });
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
