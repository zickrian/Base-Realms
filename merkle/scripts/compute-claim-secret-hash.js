/**
 * Menghitung bytes32 _claimSecretHash untuk constructor QRISClaimHash.
 * Harus sama dengan backend: keccak256(toBytes(QRIS_CLAIM_SECRET)).
 *
 * Usage: node merkle/scripts/compute-claim-secret-hash.js
 * Butuh .env atau QRIS_CLAIM_SECRET di env.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const { keccak256, toBytes } = require('viem');

const secret = process.env.QRIS_CLAIM_SECRET;
if (!secret) {
  console.error('QRIS_CLAIM_SECRET tidak ada di .env.local atau environment.');
  process.exit(1);
}

const claimSecretHash = keccak256(toBytes(secret));
console.log('Gunakan nilai ini sebagai constructor argument _claimSecretHash (tanpa 0x di Remix jika diminta raw):');
console.log(claimSecretHash);
