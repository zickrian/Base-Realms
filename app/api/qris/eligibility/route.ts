import { NextRequest, NextResponse } from 'next/server';
import { validateWalletHeader } from '@/app/lib/validation';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    const address = walletValidation.address.toLowerCase();

    const { data: payment, error } = await supabaseAdmin
      .from('qris_payments')
      .select('id, order_id, status')
      .eq('user_wallet_address', address)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !payment) {
      return NextResponse.json({
        eligible: false,
        message: 'No eligible payment found'
      }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.qris) });
    }

    return NextResponse.json({
      eligible: true,
      paymentId: payment.order_id,
      amount: 1000
    }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.qris) });
  } catch (error) {
    console.error('Eligibility check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
