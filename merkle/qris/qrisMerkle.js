const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("ethers");

// === IN MEMORY DB (ganti database nanti) ===
let claims = []; // { address, claimId }

// Reward fixed: 10 IDRX (IDRX 2 decimals => 1000 units)
const REWARD_AMOUNT = 1000n;

function normalizeClaimId(claimId) {
  // Accept bytes32 hex string directly
  if (typeof claimId === "string" && /^0x[0-9a-fA-F]{64}$/.test(claimId)) {
    return claimId.toLowerCase();
  }
  // Otherwise hash string to bytes32 (stable)
  return ethers.id(String(claimId));
}

// format leaf HARUS sama dgn contract:
// keccak256(abi.encodePacked(address, REWARD_AMOUNT, claimId))
function hashLeaf(address, claimId) {
  const normalizedClaimId = normalizeClaimId(claimId);
  const hash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "bytes32"],
    [address, REWARD_AMOUNT, normalizedClaimId]
  );
  // Remove '0x' prefix and convert to Buffer
  return Buffer.from(hash.slice(2), "hex");
}

function buildTree() {
  const leaves = claims.map(c => hashLeaf(c.address, c.claimId));
  // Build Merkle tree with sorted pairs (must match contract)
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree;
}

function getRoot() {
  const tree = buildTree();
  return tree.getHexRoot();
}

function getProof(address, claimId) {
  const tree = buildTree();
  const leaf = hashLeaf(address, claimId);
  // getHexProof expects Buffer, tapi hashLeaf sudah return Buffer
  return tree.getHexProof(leaf);
}

function addClaim(address, claimId) {
  const normalizedClaimId = normalizeClaimId(claimId);
  // anti duplicate by (address, claimId)
  const exists = claims.find(c =>
    c.address.toLowerCase() === address.toLowerCase() &&
    normalizeClaimId(c.claimId) === normalizedClaimId
  );
  if (!exists) claims.push({ address, claimId: normalizedClaimId });
}

/**
 * Helper: Tambah claim baru dan langsung return root baru
 * Ini yang dipanggil backend setelah webhook Midtrans approve
 */
function addClaimAndGetRoot(address, claimId) {
  addClaim(address, claimId);
  return getRoot();
}

/**
 * Helper: Cek apakah root berubah setelah tambah claim
 * Berguna untuk batch update (update root hanya kalau ada perubahan)
 */
function getRootAfterAddClaim(address, claimId) {
  const oldRoot = getRoot();
  addClaim(address, claimId);
  const newRoot = getRoot();
  return {
    changed: oldRoot !== newRoot,
    oldRoot,
    newRoot,
    totalClaims: claims.length
  };
}

module.exports = {
  addClaim,
  getRoot,
  getProof,
  addClaimAndGetRoot, // Helper untuk backend
  getRootAfterAddClaim, // Helper untuk batch update
  claims,
  REWARD_AMOUNT,
  normalizeClaimId
};

// Kalau dijalankan langsung: node qrisMerkle.js
if (require.main === module) {
  console.log("=== QRIS Merkle Tree Test ===\n");
  
  // Simulasi: Pembayaran pertama
  console.log("📝 Step 1: Tambah pembayaran pertama");
  addClaim("0x1234567890123456789012345678901234567890", "payment-001");
  console.log("Root setelah claim 1:", getRoot());
  
  // Simulasi: Pembayaran kedua (address sama, claimId beda)
  console.log("\n📝 Step 2: Tambah pembayaran kedua (address sama)");
  addClaim("0x1234567890123456789012345678901234567890", "payment-002");
  console.log("Root setelah claim 2:", getRoot());
  console.log("⚠️  Root BERUBAH! Admin harus update contract dengan root baru");
  
  // Simulasi: Pembayaran ketiga (address berbeda)
  console.log("\n📝 Step 3: Tambah pembayaran ketiga (address berbeda)");
  addClaim("0x9876543210987654321098765432109876543210", "payment-003");
  console.log("Root setelah claim 3:", getRoot());
  console.log("⚠️  Root BERUBAH lagi! Admin harus update contract");
  
  console.log("\n📊 Total claims:", claims.length);
  console.log("Claims:", claims.map(c => ({ 
    address: c.address, 
    claimId: c.claimId 
  })));
  
  // Test: ambil proof untuk claim pertama
  console.log("\n🔍 Test: Ambil proof untuk claim pertama");
  const testAddress = "0x1234567890123456789012345678901234567890";
  const testClaimId = "payment-001";
  const proof = getProof(testAddress, testClaimId);
  console.log("Address:", testAddress);
  console.log("claimId:", testClaimId);
  console.log("claimId (bytes32):", normalizeClaimId(testClaimId));
  console.log("Proof:", proof);
  console.log("\n💡 Frontend akan panggil: claim(claimIdBytes32, proof)");
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 RINGKASAN FLOW:");
  console.log("=".repeat(60));
  console.log("1. Backend terima webhook Midtrans (settlement)");
  console.log("2. Backend panggil: addClaim(address, paymentId)");
  console.log("3. Backend panggil: getRoot() → dapat root baru");
  console.log("4. Admin update contract: setMerkleRoot(rootBaru)");
  console.log("5. User request proof: getProof(address, claimId)");
  console.log("6. User claim onchain: claim(claimIdBytes32, proof)");
  console.log("\n⚠️  PENTING: Root HARUS di-update ke contract");
  console.log("    sebelum user bisa claim!");
  
  console.log("\n" + "=".repeat(60));
  console.log("💡 STRATEGI BATCH UPDATE (Lebih Efisien):");
  console.log("=".repeat(60));
  console.log("❌ Jangan update root setiap pembayaran (mahal!)");
  console.log("✅ Update root secara BATCH:");
  console.log("   - Setiap 5-10 pembayaran baru");
  console.log("   - Atau setiap 5-10 menit (cron job)");
  console.log("   - Atau setiap jam");
  console.log("\nContoh di backend:");
  console.log("```javascript");
  console.log("// Webhook handler");
  console.log("qris.addClaim(address, paymentId);");
  console.log("pendingClaims++;");
  console.log("");
  console.log("// Batch update setiap 5 pembayaran");
  console.log("if (pendingClaims >= 5) {");
  console.log("  const newRoot = qris.getRoot();");
  console.log("  await contract.setMerkleRoot(newRoot);");
  console.log("  pendingClaims = 0;");
  console.log("}");
  console.log("```");
}