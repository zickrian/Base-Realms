/**
 * QRIS Payment Cancellation API
 * 
 * POST /api/qris/cancel
 * Marks a QRIS payment as failed when user cancels
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CancelQRISRequest {
  orderId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CancelQRISRequest = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get payment from database
    const { data: payment, error: fetchError } = await supabase
      .from('qris_payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Only cancel if payment is still pending
    if (payment.status === 'pending') {
      const { error: updateError } = await supabase
        .from('qris_payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Failed to update payment status:', updateError);
        return NextResponse.json(
          { error: 'Failed to cancel payment' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled',
    }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.qris) });
  } catch (error) {
    console.error('Cancel payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
