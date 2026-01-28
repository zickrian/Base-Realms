import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { getStorageUrl } from '@/app/utils/supabaseStorage';
import { validateWalletHeader, isValidUUID, sanitizeErrorMessage, devLog } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { cardTemplateId } = body;
    const walletAddress = request.headers.get('x-wallet-address');

    // Validate wallet address
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
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

    // If cardTemplateId is null or undefined, deselect (set to null)
    if (!cardTemplateId) {
      const { error: profileError } = await supabaseAdmin
        .from('player_profiles')
        .update({ selected_card_id: null })
        .eq('user_id', user.id)
        .select()
        .single();

      if (profileError) {
        throw profileError;
      }

      return NextResponse.json({
        success: true,
        card: null,
      });
    }

    // Validate cardTemplateId format
    if (!isValidUUID(cardTemplateId)) {
      return NextResponse.json(
        { error: 'Invalid card template ID' },
        { status: 400 }
      );
    }

    // Verify user has this card in inventory
    const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_template_id', cardTemplateId)
      .gt('quantity', 0)
      .single();

    if (inventoryError || !inventoryItem) {
      return NextResponse.json(
        { error: 'Card not found in inventory' },
        { status: 404 }
      );
    }

    // Get card template details
    const { data: cardTemplate, error: cardError } = await supabaseAdmin
      .from('card_templates')
      .select('*')
      .eq('id', cardTemplateId)
      .single();

    if (cardError || !cardTemplate) {
      return NextResponse.json(
        { error: 'Card template not found' },
        { status: 404 }
      );
    }

    // Validate token_id exists for NFT cards
    if (cardTemplate.source_type === 'nft' && !cardTemplate.token_id) {
      return NextResponse.json(
        { error: 'This card cannot be used in battle (missing token_id)' },
        { status: 400 }
      );
    }

    // Update player profile with selected card
    const { error: profileError } = await supabaseAdmin
      .from('player_profiles')
      .update({ selected_card_id: cardTemplateId })
      .eq('user_id', user.id)
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // Format image_url
    const formattedCard = {
      ...cardTemplate,
      image_url: cardTemplate.image_url ? getStorageUrl(cardTemplate.image_url) : null,
      token_id: cardTemplate.token_id,
    };

    return NextResponse.json({
      success: true,
      card: formattedCard,
    });
  } catch (error: unknown) {
    devLog.error('Select card error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to select card') },
      { status: 500 }
    );
  }
}

