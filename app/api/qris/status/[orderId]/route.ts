/**
 * QRIS Payment Status API
 * 
 * GET /api/qris/status/[orderId]
 * Checks the status of a QRIS payment transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { midtransClient } from '@/app/lib/midtrans/client';

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
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (dbError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If already settled or failed, return cached status
    if (payment.status === 'success' || payment.status === 'failed') {
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          orderId: payment.order_id,
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.transaction_id,
          updatedAt: payment.updated_at,
        },
      });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    if (now > expiresAt && payment.status === 'pending') {
      // Update to expired
      await supabase
        .from('qris_payments')
        .update({ status: 'expired' })
        .eq('id', payment.id);

      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          orderId: payment.order_id,
          status: 'expired',
          amount: payment.amount,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    // Check status from Midtrans
    let midtransStatus;
    try {
      midtransStatus = await midtransClient.getTransactionStatus(orderId);
      console.log('[QRIS Status] Midtrans response:', {
        orderId,
        transaction_status: midtransStatus.transaction_status,
        fraud_status: midtransStatus.fraud_status
      });
    } catch (error) {
      console.error('[QRIS Status] Midtrans check error:', error);
      // Return current DB status on error
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          orderId: payment.order_id,
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.transaction_id,
          updatedAt: payment.updated_at,
        },
      });
    }

    // Map Midtrans status to our status
    let newStatus = payment.status;
    if (midtransStatus.transaction_status === 'settlement') {
      newStatus = 'success';
    } else if (midtransStatus.transaction_status === 'expire') {
      newStatus = 'expired';
    } else if (midtransStatus.transaction_status === 'deny' || midtransStatus.transaction_status === 'cancel') {
      newStatus = 'failed';
    }

    console.log('[QRIS Status] Status mapping:', {
      orderId,
      oldStatus: payment.status,
      newStatus,
      midtransStatus: midtransStatus.transaction_status
    });

    // Update database if status changed
    if (newStatus !== payment.status) {
      console.log('[QRIS Status] Updating DB status to:', newStatus);
      await supabase
        .from('qris_payments')
        .update({ status: newStatus })
        .eq('id', payment.id);

      // If successful, credit the user's IDRX balance
      if (newStatus === 'success') {
        console.log('[QRIS Status] Payment successful, crediting IDRX...');
        
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
            console.error('[QRIS Status] Failed to credit IDRX:', balanceError);
          } else {
            console.log('[QRIS Status] IDRX credited successfully:', {
              wallet: payment.user_wallet_address,
              amount: payment.amount,
              newBalance
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        status: newStatus,
        amount: payment.amount,
        transactionId: payment.transaction_id,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
