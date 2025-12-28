import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function GET() {
  try {
    // Select only needed fields for better performance
    const { data: packs, error } = await supabaseAdmin
      .from('card_packs')
      .select('id, name, rarity, price_idrx, price_eth, image_url, description, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Add cache headers for better performance
    return NextResponse.json(
      { packs: packs || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('Get card packs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get card packs' },
      { status: 500 }
    );
  }
}

