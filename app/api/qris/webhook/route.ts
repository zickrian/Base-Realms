/**
 * QRIS Webhook API
 * 
 * POST /api/qris/webhook
 * Receives payment notifications from Midtrans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { midtransClient } from '@/app/lib/midtrans/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status: string;
  currency: string;
}

export async function POST(request: NextRequest) {
  try {
    const notification: MidtransNotification = await request.json();

    console.log('Received Midtrans notification:', notification);

    // Verify signature
    const isValid = midtransClient.verifySignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
      notification.signature_key
    );

    if (!isValid) {
      console.error('Invalid signature from Midtrans');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Get payment from database
    const { data: payment, error: dbError } = await supabase
      .from('qris_payments')
      .select('*')
      .eq('order_id', notification.order_id)
      .single();

    if (dbError || !payment) {
      console.error('Payment not found:', notification.order_id);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Map transaction status
    let newStatus = payment.status;
    if (notification.transaction_status === 'settlement') {
      newStatus = 'success';
    } else if (notification.transaction_status === 'expire') {
      newStatus = 'expired';
    } else if (notification.transaction_status === 'deny' || notification.transaction_status === 'cancel') {
      newStatus = 'failed';
    }

    // Update database
    const { error: updateError } = await supabase
      .from('qris_payments')
      .update({
        status: newStatus,
        transaction_id: notification.transaction_id,
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    console.log(`Payment ${notification.order_id} updated to ${newStatus}`);

    // If successful, credit the user's IDRX balance
    if (newStatus === 'success') {
      console.log('[QRIS Webhook] Payment successful, crediting IDRX...');
      
      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('idrx_balance')
        .eq('wallet_address', payment.user_wallet_address)
        .single();

      if (profile) {
        const newBalance = (profile.idrx_balance || 0) + payment.amount;
        
        const { error: balanceError } = await supabase
          .from('user_profiles')
          .update({ idrx_balance: newBalance })
          .eq('wallet_address', payment.user_wallet_address);

        if (balanceError) {
          console.error('[QRIS Webhook] Failed to credit IDRX:', balanceError);
        } else {
          console.log('[QRIS Webhook] IDRX credited successfully:', {
            wallet: payment.user_wallet_address,
            amount: payment.amount,
            newBalance
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification processed',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
