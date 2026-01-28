import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

/**
 * Record NFT mint transaction to user_purchases
 * This endpoint records the mint transaction hash for tracking purposes
 * 
 * FIX: Better error codes - 400 for validation, 500 for server errors
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with validation
    let transactionHash: string;
    try {
      const body = await request.json();
      transactionHash = body.transactionHash;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const walletAddress = request.headers.get('x-wallet-address');

    // Validation errors - 400
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!transactionHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Validate transaction hash format (0x + 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    // Get user - 404 if not found
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

    // Check if transaction hash already exists (prevent duplicates)
    const { data: existingPurchase } = await supabaseAdmin
      .from('user_purchases')
      .select('id')
      .eq('transaction_hash', transactionHash)
      .single();

    if (existingPurchase) {
      // FIX: Return 409 Conflict instead of 200 for duplicates
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        purchase: existingPurchase,
        message: 'Transaction already recorded',
      }, { status: 409 });
    }

    // Create purchase record for mint transaction
    // For minting, we don't have a card_pack_id, so we'll use a special handling
    // Since card_pack_id is NOT NULL, we need to either:
    // 1. Create a special "Free Mint" pack, or
    // 2. Make card_pack_id nullable (requires migration)
    
    // For now, let's check if we can make it work with NULL
    // But first, let's try to find or create a "Free Mint" pack
    // FIX: Use upsert to avoid race condition when creating "Free Mint" pack
    // Multiple concurrent mints could try to create the pack simultaneously
    const { data: freeMintPack, error: packError } = await supabaseAdmin
      .from('card_packs')
      .upsert({
        name: 'Free Mint',
        rarity: 'rare', // Minimum valid rarity for card_packs
        price_idrx: 0,
        price_eth: 0,
        image_url: 'game/icons/commoncards.png',
        description: 'Free NFT mint from blockchain contract',
        is_active: true,
      }, {
        onConflict: 'name', // Assumes unique constraint on name
        ignoreDuplicates: false, // Return existing record if duplicate
      })
      .select('id')
      .single();

    if (packError || !freeMintPack) {
      console.error('[record-mint] Failed to create/get Free Mint pack:', packError);
      return NextResponse.json(
        { error: 'Database error: Failed to create Free Mint pack' },
        { status: 500 }
      );
    }

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('user_purchases')
      .insert({
        user_id: user.id,
        card_pack_id: freeMintPack.id,
        payment_method: 'eth', // Minting uses ETH (gas)
        amount_paid: 0, // Free mint, only gas cost
        transaction_hash: transactionHash,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('[record-mint] Failed to create purchase record:', purchaseError);
      return NextResponse.json(
        { error: 'Database error: Failed to create purchase record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isDuplicate: false,
      purchase,
    });
  } catch (error: unknown) {
    console.error('[record-mint] Unexpected error:', error);
    
    // FIX: Better error distinction
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
