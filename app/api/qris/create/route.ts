/**
 * QRIS Payment Creation API
 * 
 * POST /api/qris/create
 * Creates a new QRIS payment transaction with Midtrans
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { midtransClient } from '@/app/lib/midtrans/client';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateQRISRequest {
  walletAddress: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateQRISRequest = await request.json();
    const { walletAddress, amount } = body;

    // Validate input
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be a positive integer.' },
        { status: 400 }
      );
    }

    // Generate unique order ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `QRIS-${timestamp}-${randomSuffix}`;

    // Create QRIS charge with Midtrans
    let midtransResponse;
    try {
      midtransResponse = await midtransClient.createQRISCharge(orderId, amount);
    } catch (error) {
      console.error('[QRIS] Midtrans API error:', error);
      return NextResponse.json(
        { error: 'Failed to create QRIS payment. Please try again.' },
        { status: 500 }
      );
    }

    // Extract QRIS image URL from actions
    const qrisAction = midtransResponse.actions?.find(
      action => action.name === 'generate-qr-code'
    );

    if (!qrisAction || !qrisAction.url) {
      console.error('[QRIS] No QR code action found in response');
      return NextResponse.json(
        { error: 'QRIS code generation failed' },
        { status: 500 }
      );
    }

    // Calculate expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Save transaction to database
    // Store the Midtrans image URL - this is what Midtrans Simulator expects
    const { data: payment, error: dbError } = await supabase
      .from('qris_payments')
      .insert({
        user_wallet_address: walletAddress.toLowerCase(),
        amount,
        order_id: orderId,
        transaction_id: midtransResponse.transaction_id,
        qris_string: qrisAction.url, // Midtrans QR image URL for simulator
        status: 'pending',
        expires_at: expiresAt,
        midtrans_response: midtransResponse,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save payment record' },
        { status: 500 }
      );
    }

    // Return payment details
    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        qrisUrl: payment.qris_string,
        expiresAt: payment.expires_at,
        status: payment.status,
      },
    }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.qris) });
  } catch (error) {
    console.error('QRIS creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
