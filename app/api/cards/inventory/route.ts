import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { FREE_PACK_CONTRACT_ADDRESS } from '@/app/lib/blockchain/nftService';

const CONTRACT_ADDRESS = FREE_PACK_CONTRACT_ADDRESS.toLowerCase();

export async function GET(request: NextRequest) {
  try {
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

    // Select only needed fields including used and token_id for battle tracking
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select(`
        id,
        quantity,
        acquired_at,
        used,
        token_id,
        card_templates!inner(
          id,
          name,
          rarity,
          image_url,
          description,
          token_id,
          contract_address,
          atk,
          health
        )
      `)
      .eq('user_id', user.id)
      .eq('card_templates.contract_address', CONTRACT_ADDRESS)
      .not('card_templates.token_id', 'is', null)
      .order('acquired_at', { ascending: false });

    if (inventoryError) {
      console.error('[Inventory API] ❌ Failed to fetch inventory:', inventoryError);
      throw inventoryError;
    }

    console.log(`[Inventory API] ✓ Returning ${inventory?.length || 0} inventory items for wallet ${walletAddress}`);
    if (inventory && inventory.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenIds = inventory.map((item: any) => item.card_templates?.token_id).filter(Boolean);
      console.log(`[Inventory API] Token IDs in inventory:`, tokenIds);
    }

    return NextResponse.json({ 
      inventory: inventory || [],
      count: inventory?.length || 0,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Get inventory error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get inventory';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

