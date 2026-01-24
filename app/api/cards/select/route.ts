import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { getStorageUrl } from '@/app/utils/supabaseStorage';

export async function POST(request: NextRequest) {
  try {
    const { cardTemplateId } = await request.json();
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

    // If cardTemplateId is null or undefined, deselect (set to null)
    if (!cardTemplateId) {
      const { data: _profile, error: profileError } = await supabaseAdmin
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

    // Get card template details with token_id validation
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

    // Validate token_id exists for NFT cards (required for battle)
    if (cardTemplate.source_type === 'nft' && !cardTemplate.token_id) {
      return NextResponse.json(
        { error: 'This card cannot be used in battle (missing token_id)' },
        { status: 400 }
      );
    }

    // Validate token_id exists for NFT cards (required for battle)
    if (cardTemplate.source_type === 'nft' && !cardTemplate.token_id) {
      return NextResponse.json(
        { error: 'This card cannot be used in battle (missing token_id)' },
        { status: 400 }
      );
    }

    // Update player profile with selected card
    const { data: _profile, error: profileError } = await supabaseAdmin
      .from('player_profiles')
      .update({ selected_card_id: cardTemplateId })
      .eq('user_id', user.id)
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // Format image_url using getStorageUrl
    const formattedCard = {
      ...cardTemplate,
      image_url: cardTemplate.image_url ? getStorageUrl(cardTemplate.image_url) : null,
      token_id: cardTemplate.token_id, // Include token_id for CharForBattle mapping
    };

    return NextResponse.json({
      success: true,
      card: formattedCard,
    });
  } catch (error: unknown) {
    console.error('Select card error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to select card';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

