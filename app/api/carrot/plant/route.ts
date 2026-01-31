/**
 * Carrot Plant API
 * 
 * POST /api/carrot/plant
 * Plants a new carrot for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Get user from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('wallet_address', normalizedAddress)
      .single();

    if (userError) {
      console.error('[Carrot Plant] User error:', userError);
      
      // If user not found, they need to login first
      if (userError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Please login to the game first. Go to the login page to connect your wallet.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Please login to the game first. Go to the login page to connect your wallet.' },
        { status: 401 }
      );
    }

    // Check if user already has an active carrot
    const { data: existingCarrot, error: checkError } = await supabase
      .from('carrot_plants')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['planted', 'harvestable'])
      .maybeSingle(); // Use maybeSingle to avoid error if no rows

    if (checkError) {
      console.error('[Carrot Plant] Check error:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing carrot' },
        { status: 500 }
      );
    }

    if (existingCarrot) {
      return NextResponse.json(
        { error: 'You already have an active carrot. Please harvest it first.' },
        { status: 400 }
      );
    }

    // Calculate harvestable time (6 hours from now)
    const plantedAt = new Date();
    const harvestableAt = new Date(plantedAt.getTime() + 6 * 60 * 60 * 1000); // 6 hours

    // Create new carrot plant
    const { data: newCarrot, error: insertError } = await supabase
      .from('carrot_plants')
      .insert({
        user_id: user.id,
        wallet_address: normalizedAddress,
        planted_at: plantedAt.toISOString(),
        harvestable_at: harvestableAt.toISOString(),
        status: 'planted',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Carrot Plant] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to plant carrot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      carrot: {
        id: newCarrot.id,
        plantedAt: newCarrot.planted_at,
        harvestableAt: newCarrot.harvestable_at,
        status: newCarrot.status,
      },
    });
  } catch (error) {
    console.error('[Carrot Plant] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
