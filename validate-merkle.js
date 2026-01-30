/**
 * Validation Script for Merkle Service
 * Run with: node validate-merkle.js
 */

const { validateMerkleRoot, getMerkleRoot, getProofForToken, getStatsForToken, getAllTokenIds } = require('./app/lib/blockchain/merkleService');

console.log('=== Merkle Service Validation ===\n');

// Test 1: Validate Merkle Root
console.log('Test 1: Validating Merkle Root...');
const isValid = validateMerkleRoot();
const root = getMerkleRoot();
console.log(`  Expected: 0xf92321255d63a7a9d08684e50479f5d9ca625dfd8c902319e28d10bd029406c8`);
console.log(`  Actual:   ${root}`);
console.log(`  Valid:    ${isValid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Get stats for token
console.log('Test 2: Get stats for token ID 1...');
const stats = getStatsForToken(1);
console.log(`  Token ID: ${stats?.tokenId}`);
console.log(`  HP:       ${stats?.hp}`);
console.log(`  Attack:   ${stats?.attack}`);
console.log(`  Status:   ${stats ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Generate proof
console.log('Test 3: Generate proof for token ID 1...');
try {
  const proofData = getProofForToken(1);
  console.log(`  Proof length: ${proofData.proof.length} elements`);
  console.log(`  Leaf:         ${proofData.leaf}`);
  console.log(`  Proof[0]:     ${proofData.proof[0]}`);
  console.log(`  Status:       ✅ PASS\n`);
} catch (error) {
  console.log(`  Status: ❌ FAIL - ${error.message}\n`);
}

// Test 4: Check multiple tokens
console.log('Test 4: Validate first 10 tokens...');
let passCount = 0;
for (let i = 1; i <= 10; i++) {
  try {
    const proofData = getProofForToken(i);
    if (proofData.proof.length > 0 && proofData.stats.tokenId === i) {
      passCount++;
    }
  } catch (error) {
    console.log(`  Token ${i}: ❌ FAIL - ${error.message}`);
  }
}
console.log(`  Passed: ${passCount}/10`);
console.log(`  Status: ${passCount === 10 ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Total stats count
const allTokenIds = getAllTokenIds();
console.log('Test 5: Stats count...');
console.log(`  Total tokens: ${allTokenIds.length}`);
console.log(`  Status: ${allTokenIds.length === 999 ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('=== Validation Complete ===');
console.log(`Overall: ${isValid && stats && passCount === 10 && allTokenIds.length === 999 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
