const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("ethers");

// === IN MEMORY DB (ganti database nanti) ===
let claims = []; // { address, amount }

// format leaf = address + amount (HARUS sama dgn contract)
// Match dengan: keccak256(abi.encodePacked(address, amount)) di qris.sol
function hashLeaf(address, amount) {
  // Use solidityPackedKeccak256 to match Solidity's keccak256(abi.encodePacked(...))
  const hash = ethers.solidityPackedKeccak256(
    ["address", "uint256"],
    [address, amount]
  );
  // Remove '0x' prefix and convert to Buffer
  return Buffer.from(hash.slice(2), "hex");
}

function buildTree() {
  const leaves = claims.map(c => hashLeaf(c.address, c.amount));
  // Build Merkle tree with sorted pairs (must match contract)
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree;
}

function getRoot() {
  const tree = buildTree();
  return tree.getHexRoot();
}

function getProof(address, amount) {
  const tree = buildTree();
  const leaf = hashLeaf(address, amount);
  // getHexProof expects Buffer, tapi hashLeaf sudah return Buffer
  return tree.getHexProof(leaf);
}

function addClaim(address, amount) {
  // anti duplicate (case-insensitive untuk address)
  const exists = claims.find(
    c => c.address.toLowerCase() === address.toLowerCase()
  );
  if (!exists) claims.push({ address, amount });
}

module.exports = {
  addClaim,
  getRoot,
  getProof,
  claims
};