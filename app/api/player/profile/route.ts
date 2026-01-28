import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { getStorageUrl } from '@/app/utils/supabaseStorage';
import { validateWalletHeader, sanitizeErrorMessage, devLog } from '@/app/lib/validation';

export async function GET(request: NextRequest) {
  try {
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

    // Get player profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('player_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get stage separately if needed
    let stage = null;
    if (profile.current_stage_id) {
      const { data: stageData } = await supabaseAdmin
        .from('stages')
        .select('id, name, stage_number')
        .eq('id', profile.current_stage_id)
        .single();
      stage = stageData;
    }

    // Get selected card details if exists
    let selectedCard = null;
    if (profile.selected_card_id) {
      const { data: cardData } = await supabaseAdmin
        .from('card_templates')
        .select('id, name, rarity, image_url, atk, health, token_id')
        .eq('id', profile.selected_card_id)
        .single();
      
      if (cardData) {
        selectedCard = {
          ...cardData,
          image_url: cardData.image_url ? getStorageUrl(cardData.image_url) : null,
          token_id: cardData.token_id,
        };
      }
    }

    // Calculate XP percentage
    const xpPercentage = profile.max_xp > 0 
      ? (profile.current_xp / profile.max_xp) * 100 
      : 0;

    const currentXp = Number(profile.current_xp) || 0;
    const maxXp = Number(profile.max_xp) || 100;
    const level = Number(profile.level) || 1;

    return NextResponse.json({
      profile: {
        userId: user.id, // Added for realtime subscription
        level,
        currentXp,
        maxXp,
        xpPercentage: Math.round(xpPercentage * 100) / 100,
        totalBattles: profile.total_battles || 0,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
        stage: stage,
        selectedCardId: profile.selected_card_id || null,
        selectedCard: selectedCard,
      },
    });
  } catch (error: unknown) {
    devLog.error('Get profile error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to get profile') },
      { status: 500 }
    );
  }
}

