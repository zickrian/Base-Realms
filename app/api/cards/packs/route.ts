import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

export async function GET() {
  try {
    // Select only needed fields for better performance
    // Exclude "Free Mint" pack and any packs with price 0 - they should only be available on home screen, not in cards shop
    const { data: packs, error } = await supabaseAdmin
      .from('card_packs')
      .select('id, name, rarity, price_idrx, price_eth, image_url, description, is_active')
      .eq('is_active', true)
      .neq('name', 'Free Mint')
      .gt('price_eth', 0) // Only show packs with price > 0
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Add cache headers for better performance
    return NextResponse.json(
      { packs: packs || [] },
      { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.cardPacks) }
    );
  } catch (error: unknown) {
    console.error('Get card packs error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get card packs';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

