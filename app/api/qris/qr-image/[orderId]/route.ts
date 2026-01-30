/**
 * QRIS QR Code Image Proxy
 * 
 * GET /api/qris/qr-image/[orderId]
 * Returns Midtrans QRIS image URL or proxies the image
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

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
      .select('qris_string')
      .eq('order_id', orderId)
      .single();

    if (dbError || !payment || !payment.qris_string) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    // If qris_string is a Midtrans URL, fetch and proxy it with auth
    if (payment.qris_string.startsWith('https://api.sandbox.midtrans.com') || 
        payment.qris_string.startsWith('https://api.midtrans.com')) {
      
      const serverKey = process.env.MIDTRANS_SERVER_KEY!;
      const authHeader = Buffer.from(`${serverKey}:`).toString('base64');

      const imageResponse = await fetch(payment.qris_string, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
        },
      });

      if (!imageResponse.ok) {
        console.error('Failed to fetch QR from Midtrans:', imageResponse.status);
        return NextResponse.json(
          { error: 'Failed to fetch QR code' },
          { status: 500 }
        );
      }

      const imageBuffer = await imageResponse.arrayBuffer();

      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
          ...createCacheHeaders(ROUTE_CACHE_POLICIES.qris),
        },
      });
    }

    // Fallback: if it's raw QRIS string, generate QR code
    // (This shouldn't happen with new flow, but keep for backward compatibility)
    return NextResponse.json(
      { error: 'Invalid QRIS data format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('QR image error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
