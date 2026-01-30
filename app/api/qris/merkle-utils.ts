/**
 * QRIS Merkle Tree Utilities
 * 
 * Helper functions for generating Merkle roots and proofs
 */

import { supabaseAdmin } from '@/app/lib/supabase/server';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { keccak256 as viemKeccak256, encodePacked, getAddress, toBytes } from 'viem';

function hashLeafWithClaimId(address: `0x${string}`, amount: bigint, claimId: `0x${string}`): Buffer {
  // Match contract: keccak256(abi.encodePacked(address, REWARD_AMOUNT, claimId))
  const packed = encodePacked(
    ['address', 'uint256', 'bytes32'],
    [address, amount, claimId]
  );
  const hash = viemKeccak256(packed);
  return Buffer.from(hash.slice(2), 'hex');
}

function normalizeClaimId(claimId: string): `0x${string}` {
  if (/^0x[0-9a-fA-F]{64}$/.test(claimId)) {
    return claimId.toLowerCase() as `0x${string}`;
  }
  // Hash string to bytes32 (same as ethers.id - keccak256(utf8ToBytes(string)))
  // viem: keccak256(toBytes(string)) = ethers.id(string)
  return viemKeccak256(toBytes(claimId)) as `0x${string}`;
}

function buildTreeFromClaims(claims: Array<{ address: `0x${string}`; amount: bigint; claimId: `0x${string}` }>): MerkleTree {
  const leaves = claims.map(c => hashLeafWithClaimId(c.address, c.amount, c.claimId));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

/**
 * Generate Merkle root from all successful payments in database
 */
export async function generateMerkleRoot(): Promise<string> {
  const { data: allPayments } = await supabaseAdmin
    .from('qris_payments')
    .select('user_wallet_address, order_id')
    .eq('status', 'success');

  interface Payment {
    user_wallet_address: string;
    order_id: string;
  }

  const claims = (allPayments || []).map((p: Payment) => {
    const checksumAddr = getAddress(p.user_wallet_address) as `0x${string}`;
    return {
      address: checksumAddr,
      amount: BigInt(1000),
      claimId: normalizeClaimId(p.order_id)
    };
  });

  const tree = buildTreeFromClaims(claims);
  return tree.getHexRoot();
}

export { normalizeClaimId, hashLeafWithClaimId, buildTreeFromClaims };
