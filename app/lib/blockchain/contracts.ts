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
export const BATTLE_CONTRACT_ADDRESS = "0xF3E01c4a30FCD69DaeB05dc39b9bA277d0423436" as const;

/** WinToken Contract - Soulbound token minted on victory */
export const WINTOKEN_CONTRACT_ADDRESS = "0x7F82b4D1D76369f9C21b1944C409f9Cc69a95638" as const;

/** IDRX Token Contract - ERC20 token used for battle fees */
export const IDRX_CONTRACT_ADDRESS = "0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22" as const;

/** Official Merkle Root - Embedded in Battle Contract */
export const MERKLE_ROOT = "0xf92321255d63a7a9d08684e50479f5d9ca625dfd8c902319e28d10bd029406c8" as const;

/** Battle fee amount (5 IDRX) */
export const BATTLE_FEE_AMOUNT = "5000000000000000000" as const; // 5 IDRX in wei (18 decimals)

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
] as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BattleContractABI = typeof BATTLE_CONTRACT_ABI;
export type IDRXContractABI = typeof IDRX_CONTRACT_ABI;
export type NFTContractABI = typeof NFT_CONTRACT_ABI;
export type WinTokenContractABI = typeof WINTOKEN_CONTRACT_ABI;
