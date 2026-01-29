/**
 * Get QRIS Image URL for Midtrans Simulator
 * 
 * GET /api/qris/qr-url/[orderId]
 * Returns the Midtrans QRIS image URL for use in simulator
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get payment from database
    const { data: payment, error: dbError } = await supabase
      .from('qris_payments')
      .select('qris_string, order_id, amount, status')
      .eq('order_id', orderId)
      .single();

    if (dbError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Return Midtrans URL for simulator
    return NextResponse.json({
      success: true,
      orderId: payment.order_id,
      qrisUrl: payment.qris_string,
      amount: payment.amount,
      status: payment.status,
      instructions: {
        step1: 'Copy the qrisUrl value',
        step2: 'Go to https://simulator.sandbox.midtrans.com/v2/qris/index',
        step3: 'Paste the URL and click Submit',
        step4: 'Click Pay to complete the payment simulation',
      },
    });
  } catch (error) {
    console.error('Get QR URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
