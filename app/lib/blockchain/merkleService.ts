/**
 * Merkle Proof Service
 * 
 * Handles Merkle tree generation and proof lookup for NFT battle stats.
 * This service ensures that all HP and Attack values sent to the Battle Contract
 * can be verified against the official Merkle Root.
 * 
 * @module merkleService
 */

import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { solidityPackedKeccak256 } from 'ethers';
import stats from '../../../merkle/stats.json';

// ============================================================================
// TYPES
// ============================================================================

export interface NFTStats {
  tokenId: number;
  hp: number;
  attack: number;
}

export interface MerkleProofResult {
  proof: string[];
  leaf: string;
  stats: NFTStats;
}

// ============================================================================
// MERKLE TREE SINGLETON
// ============================================================================

let merkleTreeInstance: MerkleTree | null = null;

/**
 * Generate Merkle Tree from stats.json
 * Uses same algorithm as generateMerkle.js for consistency
 * 
 * Algorithm:
 * 1. For each stat entry, create leaf: keccak256(abi.encodePacked(tokenId, hp, attack))
 * 2. Build Merkle tree with keccak256 hashing and sorted pairs
 * 3. Cache tree instance for reuse
 */
function getMerkleTree(): MerkleTree {
  if (merkleTreeInstance) {
    return merkleTreeInstance;
  }

  // Generate leaves using same format as smart contract
  const leaves = stats.map((stat) => {
    // Use solidityPackedKeccak256 to match Solidity's keccak256(abi.encodePacked(...))
    const hash = solidityPackedKeccak256(
      ['uint256', 'uint256', 'uint256'],
      [stat.tokenId, stat.hp, stat.attack]
    );
    // Remove '0x' prefix and convert to Buffer
    return Buffer.from(hash.slice(2), 'hex');
  });

  // Build Merkle tree with sorted pairs (must match contract)
  merkleTreeInstance = new MerkleTree(leaves, keccak256, { sortPairs: true });

  return merkleTreeInstance;
}

/**
 * Get Merkle root (for verification purposes)
 * Should match: 0xf92321255d63a7a9d08684e50479f5d9ca625dfd8c902319e28d10bd029406c8
 */
export function getMerkleRoot(): string {
  const tree = getMerkleTree();
  return tree.getHexRoot();
}

// ============================================================================
// STATS LOOKUP
// ============================================================================

/**
 * Get stats for a specific token ID from stats.json
 * 
 * @param tokenId - NFT token ID (1-999)
 * @returns Stats object or null if not found
 */
export function getStatsForToken(tokenId: number): NFTStats | null {
  const stat = stats.find((s) => s.tokenId === tokenId);
  if (!stat) {
    return null;
  }
  return {
    tokenId: stat.tokenId,
    hp: stat.hp,
    attack: stat.attack,
  };
}

/**
 * Validate that token ID exists in stats.json
 * 
 * @param tokenId - NFT token ID to validate
 * @returns true if token exists, false otherwise
 */
export function isValidTokenId(tokenId: number): boolean {
  return stats.some((s) => s.tokenId === tokenId);
}

// ============================================================================
// MERKLE PROOF GENERATION
// ============================================================================

/**
 * Generate Merkle proof for a specific token ID
 * 
 * This proof will be sent to the Battle Contract to verify that the
 * HP and Attack values are legitimate.
 * 
 * @param tokenId - NFT token ID (1-999)
 * @returns Proof data including proof array, leaf hash, and stats
 * @throws Error if token ID not found
 * 
 * @example
 * const proof = getProofForToken(42);
 * // Returns: { proof: ['0x...', '0x...'], leaf: '0x...', stats: { tokenId: 42, hp: 150, attack: 20 } }
 */
export function getProofForToken(tokenId: number): MerkleProofResult {
  // Get stats for this token
  const stats = getStatsForToken(tokenId);
  if (!stats) {
    throw new Error(`Token ID ${tokenId} not found in stats.json`);
  }

  // Generate leaf hash (same as contract will compute)
  const leafHash = solidityPackedKeccak256(
    ['uint256', 'uint256', 'uint256'],
    [stats.tokenId, stats.hp, stats.attack]
  );

  // Convert to Buffer for MerkleTree library
  const leaf = Buffer.from(leafHash.slice(2), 'hex');

  // Get Merkle tree and generate proof
  const tree = getMerkleTree();
  const proof = tree.getHexProof(leaf);

  return {
    proof,
    leaf: leafHash,
    stats,
  };
}

/**
 * Verify a Merkle proof (for testing purposes)
 * 
 * @param tokenId - NFT token ID
 * @param hp - HP value to verify
 * @param attack - Attack value to verify
 * @param proof - Merkle proof array
 * @returns true if proof is valid, false otherwise
 */
export function verifyProof(
  tokenId: number,
  hp: number,
  attack: number,
  proof: string[]
): boolean {
  try {
    const tree = getMerkleTree();
    const root = tree.getHexRoot();

    // Generate leaf
    const leafHash = solidityPackedKeccak256(
      ['uint256', 'uint256', 'uint256'],
      [tokenId, hp, attack]
    );
    const leaf = Buffer.from(leafHash.slice(2), 'hex');

    // Verify proof
    return tree.verify(proof, leaf, root);
  } catch {
    return false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all available token IDs from stats.json
 * 
 * @returns Array of all token IDs
 */
export function getAllTokenIds(): number[] {
  return stats.map((s) => s.tokenId);
}

/**
 * Get stats count
 * 
 * @returns Total number of NFTs in stats.json
 */
export function getStatsCount(): number {
  return stats.length;
}

/**
 * Validate Merkle root matches expected value
 * Call this on app initialization to ensure data integrity
 * 
 * @returns true if root matches, false otherwise
 */
export function validateMerkleRoot(): boolean {
  const expectedRoot = '0xf92321255d63a7a9d08684e50479f5d9ca625dfd8c902319e28d10bd029406c8';
  const actualRoot = getMerkleRoot();
  
  if (actualRoot !== expectedRoot) {
    console.error('[MerkleService] Merkle root mismatch!');
    console.error(`Expected: ${expectedRoot}`);
    console.error(`Actual:   ${actualRoot}`);
    return false;
  }
  
  return true;
}
