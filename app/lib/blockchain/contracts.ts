/**
 * Smart Contract Configuration
 * 
 * Contains all contract addresses and ABIs for the battle system
 * All contracts are deployed on Base network (Chain ID: 8453)
 */

// ============================================================================
// CONTRACT ADDRESSES (Base Network)
// ============================================================================

/** NFT Contract - BaseRealmsCharacter (ERC721) */
export const NFT_CONTRACT_ADDRESS = "0xabab2d0A3EAF9722E3EE0840D0360c68899cB305" as const;

/** Battle Contract - Handles battle logic and Merkle proof verification */
export const BATTLE_CONTRACT_ADDRESS = "0x4267Da4AC96635c92bbE4232A9792283A1B354F2" as const;

/** WinToken Contract - Soulbound token minted on victory */
export const WINTOKEN_CONTRACT_ADDRESS = "0xB5d282f7abC8901a0B70d02442be81366831eB2d" as const;

/** IDRX Token Contract - ERC20 token used for battle fees */
export const IDRX_CONTRACT_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;

/** BattleBank Contract - Vault that holds IDRX battle fees */
export const BATTLE_BANK_CONTRACT_ADDRESS = "0x9885B2DE7b8f0169f4Ed2C17BF71bC3D5a42d684" as const;

/** Official Merkle Root - Embedded in Battle Contract */
export const MERKLE_ROOT = "0xf92321255d63a7a9d08684e50479f5d9ca625dfd8c902319e28d10bd029406c8" as const;

/** Battle fee amount (5 IDRX) */
export const BATTLE_FEE_AMOUNT = "500" as const; // 5 IDRX (2 decimals - IDRX uses 2 decimals, not 18)

/** QRIS Merkle Claim Contract - Distributor IDRX via Merkle proof */
export const QRIS_CLAIM_CONTRACT_ADDRESS = "0x65823E53153D4257dF7616f0F767155412b27FD0" as const;

/** QRIS Claim by Hash (no Merkle) - set di .env: NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS */
export const QRIS_CLAIM_HASH_CONTRACT_ADDRESS: string =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS) || '';

// ============================================================================
// CONTRACT ABIs
// ============================================================================

/**
 * Battle Contract ABI
 * Main functions:
 * - battle(tokenId, hp, attack, proof) - Execute battle with Merkle proof
 * - hasUsed(tokenId) - Check if NFT has been used
 */
export const BATTLE_CONTRACT_ABI = [
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "hp", type: "uint256" },
      { name: "attack", type: "uint256" },
      { name: "proof", type: "bytes32[]" }
    ],
    name: "battle",
    outputs: [{ name: "won", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "hasUsed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "merkleRoot",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "player", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "won", type: "bool" }
    ],
    name: "BattleCompleted",
    type: "event",
  },
] as const;

/**
 * IDRX Token ABI (ERC20)
 * Used for:
 * - Checking balance
 * - Approving Battle Contract to spend tokens
 * - Checking allowance
 */
export const IDRX_CONTRACT_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * NFT Contract ABI (ERC721)
 * Used for verifying ownership
 */
export const NFT_CONTRACT_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" }
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * WinToken Contract ABI (ERC721 Soulbound)
 * Minted to winners, cannot be transferred
 */
export const WINTOKEN_CONTRACT_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "hasMinted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * QRIS Claim Contract ABI
 * Main functions:
 * - claim(claimId, proof) - Claim IDRX reward with Merkle proof
 * - claimedLeaf(leaf) - Check if leaf already claimed
 */
export const QRIS_CLAIM_CONTRACT_ABI = [
  {
    inputs: [
      { name: "claimId", type: "bytes32" },
      { name: "proof", type: "bytes32[]" }
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "leaf", type: "bytes32" }],
    name: "claimedLeaf",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "merkleRoot",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_AMOUNT",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_newRoot", type: "bytes32" }],
    name: "setMerkleRoot",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "claimId", type: "bytes32" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "Claimed",
    type: "event",
  },
] as const;

/**
 * QRIS Claim by Hash (no Merkle)
 * claim(claimId, proofHash) - proofHash = keccak256(sender, claimId, claimSecretHash)
 */
export const QRIS_CLAIM_HASH_CONTRACT_ABI = [
  {
    inputs: [
      { name: "claimId", type: "bytes32" },
      { name: "proofHash", type: "bytes32" }
    ],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "claimId", type: "bytes32" }],
    name: "claimed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "claimSecretHash",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_AMOUNT",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_newHash", type: "bytes32" }],
    name: "setClaimSecretHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "claimId", type: "bytes32" },
      { indexed: false, name: "amount", type: "uint256" }
    ],
    name: "Claimed",
    type: "event",
  },
] as const;

export type BattleContractABI = typeof BATTLE_CONTRACT_ABI;
export type IDRXContractABI = typeof IDRX_CONTRACT_ABI;
export type NFTContractABI = typeof NFT_CONTRACT_ABI;
export type WinTokenContractABI = typeof WINTOKEN_CONTRACT_ABI;
export type QRISClaimContractABI = typeof QRIS_CLAIM_CONTRACT_ABI;
export type QRISClaimHashContractABI = typeof QRIS_CLAIM_HASH_CONTRACT_ABI;
