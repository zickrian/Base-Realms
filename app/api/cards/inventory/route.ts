import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { FREE_PACK_CONTRACT_ADDRESS } from '@/app/lib/blockchain/nftService';
import { validateWalletHeader, sanitizeErrorMessage, devLog } from '@/app/lib/validation';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

const CONTRACT_ADDRESS = FREE_PACK_CONTRACT_ADDRESS.toLowerCase();

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
      devLog.error('[Inventory API] Failed to fetch inventory:', inventoryError);
      throw inventoryError;
    }

    devLog.log(`[Inventory API] Returning ${inventory?.length || 0} items`);

    return NextResponse.json({ 
      inventory: inventory || [],
      count: inventory?.length || 0,
      fetchedAt: new Date().toISOString()
    }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.inventory) });
  } catch (error: unknown) {
    devLog.error('Get inventory error:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Failed to get inventory') },
      { status: 500 }
    );
  }
}

