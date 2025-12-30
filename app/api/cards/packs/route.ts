import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function GET() {
  const packsApiStart = Date.now();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'packs/route.ts:5',message:'packs API start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  try {
    // Select only needed fields for better performance
    // Exclude "Free Mint" pack and any packs with price 0 - they should only be available on home screen, not in cards shop
    const packsQueryStart = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'packs/route.ts:11',message:'packs query start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    const { data: packs, error } = await supabaseAdmin
      .from('card_packs')
      .select('id, name, rarity, price_idrx, price_eth, image_url, description, is_active')
      .eq('is_active', true)
      .neq('name', 'Free Mint')
      .gt('price_eth', 0) // Only show packs with price > 0
      .order('created_at', { ascending: true });

    const packsQueryEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'packs/route.ts:20',message:'packs query end',data:{duration:packsQueryEnd-packsQueryStart,count:packs?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    if (error) {
      throw error;
    }

    const packsApiEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'packs/route.ts:28',message:'packs API end',data:{totalDuration:packsApiEnd-packsApiStart},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    // Add cache headers for better performance
    return NextResponse.json(
      { packs: packs || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
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

