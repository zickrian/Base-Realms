import { NextRequest, NextResponse } from 'next/server';
import { validateWalletHeader } from '@/app/lib/validation';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { getAddress, keccak256, encodePacked, toBytes } from 'viem';
import { normalizeClaimId } from '../merkle-utils';
import { createCacheHeaders, ROUTE_CACHE_POLICIES } from '@/app/lib/cache-policy';

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.QRIS_CLAIM_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'QRIS_CLAIM_SECRET not set in env' },
        { status: 500 }
      );
    }

    const walletAddress = request.headers.get('x-wallet-address');
    const walletValidation = validateWalletHeader(walletAddress);
    if (!walletValidation.isValid) {
      return NextResponse.json(
        { error: walletValidation.error },
        { status: 400 }
      );
    }

    const address = getAddress(walletValidation.address);
    const checksumAddress = address as `0x${string}`;

    const { data: payment, error } = await supabaseAdmin
      .from('qris_payments')
      .select('order_id, status')
      .eq('user_wallet_address', address.toLowerCase())
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { error: 'No eligible payment found' },
        { status: 404 }
      );
    }

    const claimId = normalizeClaimId(payment.order_id);
    const secretHash = keccak256(toBytes(secret));
    const proofHash = keccak256(encodePacked(['address', 'bytes32', 'bytes32'], [checksumAddress, claimId, secretHash]));

    console.log('[QRIS Proof] Hash mode:', { address: checksumAddress, claimId, proofHash: proofHash.slice(0, 18) + '...' });

    return NextResponse.json({
      claimId,
      proofHash,
      amount: '1000',
    }, { headers: createCacheHeaders(ROUTE_CACHE_POLICIES.qris) });
  } catch (error) {
    console.error('Proof generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
