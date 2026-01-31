/**
 * Carrot Status API
 * 
 * GET /api/carrot/status
 * Gets current carrot status for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, wallet_address')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (profileError) {
      console.error('[Carrot Status] Profile error:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get active carrot (planted or harvestable, not harvested)
    const { data: carrot, error: carrotError } = await supabase
      .from('carrot_plants')
      .select('*')
      .eq('user_id', profile.id)
      .in('status', ['planted', 'harvestable'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle to avoid error if no rows

    if (carrotError) {
      console.error('[Carrot Status] Query error:', carrotError);
      return NextResponse.json(
        { error: 'Failed to fetch carrot status' },
        { status: 500 }
      );
    }

    if (!carrot) {
      // No active carrot
      return NextResponse.json({
        success: true,
        carrot: null,
      });
    }

    // Check if carrot is ready to harvest
    const now = new Date();
    const harvestableAt = new Date(carrot.harvestable_at);
    const isHarvestable = now >= harvestableAt;

    // Update status if needed
    if (isHarvestable && carrot.status === 'planted') {
      await supabase
        .from('carrot_plants')
        .update({ status: 'harvestable' })
        .eq('id', carrot.id);

      carrot.status = 'harvestable';
    }

    return NextResponse.json({
      success: true,
      carrot: {
        id: carrot.id,
        plantedAt: carrot.planted_at,
        harvestableAt: carrot.harvestable_at,
        status: carrot.status,
        isHarvestable,
        timeRemaining: isHarvestable ? 0 : harvestableAt.getTime() - now.getTime(),
      },
    });
  } catch (error) {
    console.error('[Carrot Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
