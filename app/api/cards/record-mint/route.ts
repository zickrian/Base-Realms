import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

/**
 * Record NFT mint transaction to user_purchases
 * This endpoint records the mint transaction hash for tracking purposes
 */
export async function POST(request: NextRequest) {
  try {
    const { transactionHash } = await request.json();
    const walletAddress = request.headers.get('x-wallet-address');

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

    // Check if transaction hash already exists (prevent duplicates)
    const { data: existingPurchase } = await supabaseAdmin
      .from('user_purchases')
      .select('id')
      .eq('transaction_hash', transactionHash)
      .single();

    if (existingPurchase) {
      // Transaction already recorded
      return NextResponse.json({
        success: true,
        purchase: existingPurchase,
        message: 'Transaction already recorded',
      });
    }

    // Create purchase record for mint transaction
    // For minting, we don't have a card_pack_id, so we'll use a special handling
    // Since card_pack_id is NOT NULL, we need to either:
    // 1. Create a special "Free Mint" pack, or
    // 2. Make card_pack_id nullable (requires migration)
    
    // For now, let's check if we can make it work with NULL
    // But first, let's try to find or create a "Free Mint" pack
    let { data: freeMintPack } = await supabaseAdmin
      .from('card_packs')
      .select('id')
      .eq('name', 'Free Mint')
      .single();

    if (!freeMintPack) {
      // Create a special "Free Mint" pack if it doesn't exist
      // Use 'rare' as minimum valid rarity (card_packs doesn't allow 'common')
      const { data: newPack, error: createPackError } = await supabaseAdmin
        .from('card_packs')
        .insert({
          name: 'Free Mint',
          rarity: 'rare', // Minimum valid rarity for card_packs
          price_idrx: 0,
          price_eth: 0,
          image_url: 'game/icons/commoncards.png',
          description: 'Free NFT mint from blockchain contract',
          is_active: true,
        })
        .select('id')
        .single();

      if (createPackError || !newPack) {
        // If we can't create pack, we need to make card_pack_id nullable
        // For now, throw error and suggest migration
        throw new Error('Failed to create Free Mint pack. Please run migration to make card_pack_id nullable.');
      }

      freeMintPack = newPack;
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
      throw purchaseError;
    }

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error: any) {
    console.error('Record mint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record mint transaction' },
      { status: 500 }
    );
  }
}
