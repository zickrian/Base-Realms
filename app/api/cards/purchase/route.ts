import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { validateWalletHeader, isValidUUID, isInWhitelist, sanitizeErrorMessage, devLog } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { packId, paymentMethod, transactionHash } = body;
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    // Validate packId format
    if (!packId || !isValidUUID(packId)) {
      return NextResponse.json(
        { error: 'Valid pack ID is required' },
        { status: 400 }
      );
    }

    // Validate paymentMethod whitelist
    if (!isInWhitelist(paymentMethod, ['eth', 'idrx'])) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
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

    // Get pack
    const { data: pack, error: packError } = await supabaseAdmin
      .from('card_packs')
      .select('*')
      .eq('id', packId)
      .eq('is_active', true)
      .single();

    if (packError || !pack) {
      return NextResponse.json(
        { error: 'Card pack not found' },
        { status: 404 }
      );
    }

    // Check if purchase with this transaction hash already exists
    if (transactionHash) {
      const { data: existingPurchase } = await supabaseAdmin
        .from('user_purchases')
        .select('id')
        .eq('transaction_hash', transactionHash)
        .single();

      if (existingPurchase) {
        return NextResponse.json({
          success: true,
          purchase: existingPurchase,
          message: 'Purchase already recorded for this transaction',
        });
      }
    }

    // Create purchase record
    const amountPaid = paymentMethod === 'eth' ? pack.price_eth : pack.price_idrx;
    
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('user_purchases')
      .insert({
        user_id: user.id,
        card_pack_id: packId,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        transaction_hash: transactionHash || null,
      })
      .select()
      .single();

    if (purchaseError) {
      throw purchaseError;
    }

    // Generate random cards based on pack rarity
    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('card_templates')
      .select('id')
      .eq('rarity', pack.rarity)
      .limit(100);

    if (cardsError || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: 'No cards found for this rarity' },
        { status: 404 }
      );
    }

    const randomCard = cards[Math.floor(Math.random() * cards.length)];

    // Create card reveal
    const { data: reveal, error: revealError } = await supabaseAdmin
      .from('card_reveals')
      .insert({
        user_id: user.id,
        purchase_id: purchase.id,
        card_template_id: randomCard.id,
      })
      .select(`
        *,
        card_templates(*)
      `)
      .single();

    if (revealError) {
      throw revealError;
    }

    // Add to inventory
    const { data: existingInventory, error: invCheckError } = await supabaseAdmin
      .from('user_inventory')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_template_id', randomCard.id)
      .single();

    if (invCheckError && invCheckError.code === 'PGRST116') {
      await supabaseAdmin
        .from('user_inventory')
        .insert({
          user_id: user.id,
          card_template_id: randomCard.id,
          quantity: 1,
        });
    } else if (!invCheckError && existingInventory) {
      await supabaseAdmin
        .from('user_inventory')
        .update({ quantity: existingInventory.quantity + 1 })
        .eq('id', existingInventory.id);
    }

    // Update quest progress
    const { updateQuestProgress } = await import('@/app/lib/db/quest-progress');
    await updateQuestProgress(user.id, 'open_packs', 1, false);

    return NextResponse.json({
      success: true,
      purchase,
      revealedCard: reveal,
    });
  } catch (error: unknown) {
    devLog.error('Purchase card error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to purchase card pack') },
      { status: 500 }
    );
  }
}

