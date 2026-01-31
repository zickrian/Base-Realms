/**
 * Carrot Harvest API
 * 
 * POST /api/carrot/harvest
 * Harvests carrot and records NFT mint
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { transactionHash, tokenId } = body;

    if (!transactionHash) {
      return NextResponse.json(
        { error: 'Transaction hash required' },
        { status: 400 }
      );
    }

    // Validate transaction hash format
    if (!transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
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
      console.error('[Carrot Harvest] User error:', userError);
      
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

    // Get harvestable carrot
    const { data: carrot, error: carrotError } = await supabase
      .from('carrot_plants')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'harvestable')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle to avoid error if no rows

    if (carrotError) {
      console.error('[Carrot Harvest] Query error:', carrotError);
      return NextResponse.json(
        { error: 'Failed to fetch carrot' },
        { status: 500 }
      );
    }

    if (!carrot) {
      return NextResponse.json(
        { error: 'No harvestable carrot found. Please wait for your carrot to grow.' },
        { status: 404 }
      );
    }

    // Verify carrot is actually ready
    const now = new Date();
    const harvestableAt = new Date(carrot.harvestable_at);
    
    if (now < harvestableAt) {
      return NextResponse.json(
        { error: 'Carrot is not ready to harvest yet' },
        { status: 400 }
      );
    }

    // Update carrot status to harvested
    const { error: updateError } = await supabase
      .from('carrot_plants')
      .update({
        status: 'harvested',
        harvested_at: now.toISOString(),
        nft_token_id: tokenId || null,
      })
      .eq('id', carrot.id);

    if (updateError) {
      console.error('[Carrot Harvest] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update carrot status' },
        { status: 500 }
      );
    }

    // TODO: Update quest progress for carrot harvesting if needed
    // await updateQuestProgress(profile.id, 'harvest_carrot');

    return NextResponse.json({
      success: true,
      carrot: {
        id: carrot.id,
        harvestedAt: now.toISOString(),
        transactionHash,
        tokenId,
      },
    });
  } catch (error) {
    console.error('[Carrot Harvest] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
