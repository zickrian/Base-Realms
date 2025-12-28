import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { packId, paymentMethod, transactionHash } = await request.json();
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!packId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Pack ID and payment method are required' },
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
    // Get cards of matching rarity
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

    // Select random card (for now, just pick one - you can implement proper random selection)
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
      // Doesn't exist, create new
      await supabaseAdmin
        .from('user_inventory')
        .insert({
          user_id: user.id,
          card_template_id: randomCard.id,
          quantity: 1,
        });
    } else if (!invCheckError && existingInventory) {
      // Exists, increment quantity
      await supabaseAdmin
        .from('user_inventory')
        .update({ quantity: existingInventory.quantity + 1 })
        .eq('id', existingInventory.id);
    }

    // Update quest progress
    const { updateQuestProgress } = await import('@/app/lib/db/quest-progress');
    await updateQuestProgress(user.id, 'open_packs', 1);

    return NextResponse.json({
      success: true,
      purchase,
      revealedCard: reveal,
    });
  } catch (error: any) {
    console.error('Purchase card error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to purchase card pack' },
      { status: 500 }
    );
  }
}

