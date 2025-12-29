import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase/server';

export async function GET(request: NextRequest) {
  const apiStartTime = Date.now();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventory/route.ts:5',message:'GET inventory API start',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get user
    const userQueryStart = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventory/route.ts:18',message:'user query start',data:{walletAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    const userQueryEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventory/route.ts:26',message:'user query end',data:{duration:userQueryEnd-userQueryStart,found:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // OPTIMIZATION: Select only needed fields instead of card_templates(*)
    // This reduces data transfer and query time
    const inventoryQueryStart = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventory/route.ts:44',message:'inventory query start (optimized)',data:{userId:user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('user_inventory')
      .select(`
        id,
        quantity,
        acquired_at,
        card_templates!inner(
          id,
          name,
          rarity,
          image_url,
          description
        )
      `)
      .eq('user_id', user.id)
      .order('acquired_at', { ascending: false });

    const inventoryQueryEnd = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventory/route.ts:45',message:'inventory query end',data:{duration:inventoryQueryEnd-inventoryQueryStart,count:inventory?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (inventoryError) {
      throw inventoryError;
    }

    const apiEndTime = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf028a41-fb49-422b-b881-48501a438ad6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'inventory/route.ts:52',message:'GET inventory API end',data:{totalDuration:apiEndTime-apiStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({ inventory: inventory || [] });
  } catch (error: any) {
    console.error('Get inventory error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get inventory' },
      { status: 500 }
    );
  }
}

