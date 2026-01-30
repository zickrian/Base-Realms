# 🏰 Base Realms

> **A Web3 Pixel Art Battle Game on Base Network**

[![Base Network](https://img.shields.io/badge/Network-Base-0052FF?style=flat-square&logo=coinbase)](https://base.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Farcaster](https://img.shields.io/badge/Farcaster-MiniKit-8A63D2?style=flat-square)](https://farcaster.xyz)
[![OnchainKit](https://img.shields.io/badge/OnchainKit-Coinbase-0052FF?style=flat-square)](https://docs.base.org/onchainkit)

Base Realms is an innovative **play-to-earn blockchain game** where players collect unique NFT characters and battle AI enemies in a turn-based combat system. Each NFT has unique stats verified on-chain through Merkle proofs, ensuring fair and tamper-proof gameplay.


---

## 📑 Table of Contents

- [🎮 Game Overview](#-game-overview)
- [✨ Key Features](#-key-features)
- [🎯 How to Play](#-how-to-play)
- [🏗️ System Architecture](#️-system-architecture)
- [📜 Smart Contracts](#-smart-contracts)
- [⚔️ Battle System](#️-battle-system)
- [🎨 NFT System](#-nft-system)
- [💰 Token Economy](#-token-economy)
- [🔐 Security: Merkle Proof Verification](#-security-merkle-proof-verification)
- [💳 QRIS Payment Integration](#-qris-payment-integration)
- [📋 Quest System](#-quest-system)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [🔧 Environment Variables](#-environment-variables)
- [📦 Deployment](#-deployment)
- [🛠️ Tech Stack](#️-tech-stack)
- [📄 License](#-license)

---

## 🎮 Game Overview

**Base Realms** is a Web3 game that combines:

- **Pixel Art Aesthetics** - Beautiful retro-style graphics with smooth animations
- **NFT Ownership** - Each character is a unique ERC-721 NFT on Base blockchain
- **On-Chain Battles** - Battle results are determined and recorded on-chain
- **Anti-Cheat System** - Stats are verified using Merkle proofs
- **Soulbound Rewards** - Winners receive non-transferable WIN tokens
- **Farcaster Integration** - Play directly within Farcaster as a MiniApp

### Game Concept

Players mint or acquire NFT characters, each with unique **HP (Health Points)** and **ATK (Attack Power)** stats. These NFTs can be used in battles against AI enemies. The battle outcome is determined by a turn-based simulation that runs entirely on-chain, ensuring transparency and fairness.

**Key Mechanic: One-Time Use NFTs**
- Each NFT can only be used in battle **ONCE**
- After battle (win or lose), the NFT becomes permanently **LOCKED**
- This creates scarcity and encourages continuous engagement
- Players must mint new NFTs to continue battling

---

## ✨ Key Features

### 🎴 NFT Character Cards
- **1000 Unique Characters** with different stats
- **4 Rarity Tiers**: Common, Rare, Epic, Legendary
- Stats range: HP (100-250), ATK (8-40)
- Higher rarity = better stats

### ⚔️ Turn-Based Combat
- Real-time battle animations
- On-chain battle resolution
- 50% win rate design (balanced gameplay)
- Visual HP bars and damage numbers

### 🏆 Win Token Rewards
- Winners receive **BRWIN** (Base Realms Win) tokens
- Soulbound tokens (non-transferable)
- Proof of victory on-chain

### 📜 Quest System
- Daily quests with XP rewards
- Quest types: Play Games, Win Games, Open Packs, Daily Login
- Level progression system

### 💳 QRIS Top-Up (Indonesia)
- Pay with Indonesian QRIS via Midtrans
- Instant IDRX token delivery
- Secure payment flow

### 🖼️ Interactive World
- Explorable pixel art environments
- Multiple locations: Home, Shop, Battle Arena, Museum
- Character movement with walk animations

### 🔗 Farcaster MiniKit
- Native Farcaster Frame integration
- Seamless wallet connection
- Social gaming experience

---

## 🎯 How to Play

### Step 1: Connect Wallet
1. Open Base Realms in Farcaster or directly via browser
2. Click **"Play"** on the landing page
3. Connect your wallet (Base network)
4. Your profile is automatically created

### Step 2: Get Your First NFT
1. Navigate to the **Shop** (walk right from Home)
2. Find the **Free Mint Box** 
3. Click to mint your first Common NFT character
4. The NFT appears in your inventory

### Step 3: Select Your Fighter
1. Go back to **Home**
2. Open **Deck Menu** (click your character or deck button)
3. Select an NFT from your inventory
4. Click **"USE"** to equip it for battle

### Step 4: Enter Battle
1. Walk to the **Arena** (building with sword icon)
2. Click the **Battle** button
3. Approve IDRX spending (5 IDRX battle fee)
4. Watch the turn-based battle unfold!

### Step 5: Battle Outcome
- **WIN**: Receive BRWIN soulbound tokens 🏆
- **LOSE**: Better luck next time! 😢
- **Both**: Your NFT is now **LOCKED** forever

### Step 6: Repeat
1. Mint or buy new NFTs
2. Select a fresh NFT
3. Battle again!

### Pro Tips
- 💡 Higher rarity NFTs have better stats
- 💡 Complete daily quests for XP bonuses
- 💡 Check the Leaderboard to see top players
- 💡 Visit the Museum to view your battle history

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router  │  React 19  │  TypeScript             │
│  ├── Landing Page       │            │                          │
│  ├── Login (Wallet)     │  Wagmi v2  │  Viem                   │
│  ├── Home World         │            │                          │
│  ├── Shop               │  OnchainKit (Coinbase)               │
│  ├── Battle Arena       │            │                          │
│  └── Components         │  Farcaster MiniKit                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (/api/*)                                    │
│  ├── /auth/login          - Wallet authentication               │
│  ├── /cards/*             - NFT inventory management            │
│  ├── /battles/*           - Battle creation & completion        │
│  ├── /quests/*            - Quest progress & rewards            │
│  ├── /qris/*              - QRIS payment processing             │
│  ├── /leaderboard         - Player rankings                     │
│  └── /player/*            - Profile management                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│      BLOCKCHAIN LAYER     │   │        DATABASE LAYER         │
├───────────────────────────┤   ├───────────────────────────────┤
│  Base Network (Chain 8453)│   │  Supabase (PostgreSQL)        │
│  ├── NFT Contract         │   │  ├── Users & Profiles         │
│  ├── Battle Contract      │   │  ├── Inventory                │
│  ├── WinToken Contract    │   │  ├── Battles History          │
│  ├── BattleBank Contract  │   │  ├── Quests                   │
│  └── QRIS Claim Contract  │   │  └── QRIS Payments            │
└───────────────────────────┘   └───────────────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │   PAYMENT GATEWAY     │
                              ├───────────────────────┤
                              │  Midtrans QRIS        │
                              │  (Indonesian Payment) │
                              └───────────────────────┘
```

---

## 📜 Smart Contracts

All contracts are deployed on **Base Mainnet (Chain ID: 8453)**

| Contract | Address | Description |
|----------|---------|-------------|
| **NFT Character** | `0xabab2d0A3EAF9722E3EE0840D0360c68899cB305` | ERC-721 NFT characters |
| **Battle** | `0x4267Da4AC96635c92bbE4232A9792283A1B354F2` | Battle logic & Merkle verification |
| **WinToken** | `0xB5d282f7abC8901a0B70d02442be81366831eB2d` | Soulbound ERC-20 rewards |
| **BattleBank** | `0x9885B2DE7b8f0169f4Ed2C17BF71bC3D5a42d684` | IDRX fee vault |
| **QRIS Claim** | `0x544596e3EFE6F407B21aA6b3430Aa8F1024fcb2a` | IDRX distribution |
| **IDRX Token** | `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22` | Payment token (2 decimals) |

---

## ⚔️ Battle System

### Battle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      BATTLE FLOW                                │
└─────────────────────────────────────────────────────────────────┘

1. SELECT NFT
   └── User selects an unused NFT from inventory

2. ENTER BATTLE
   └── Navigate to Arena and click Battle

3. PREPARATION PHASE
   ├── Generate Merkle proof for NFT stats
   ├── Check IDRX balance (need 5 IDRX)
   └── Request IDRX approval if needed

4. EXECUTE ON-CHAIN BATTLE
   ├── Call Battle contract with:
   │   ├── tokenId
   │   ├── hp (health points)
   │   ├── attack (damage)
   │   └── merkleProof[]
   ├── Contract verifies:
   │   ├── NFT ownership
   │   ├── NFT not used before
   │   └── Stats match Merkle root
   ├── Transfer 5 IDRX to BattleBank
   ├── Mark NFT as used (on-chain)
   └── Simulate battle → return win/lose

5. BATTLE ANIMATION
   └── Visual turn-based combat (client-side)

6. RESULT
   ├── WIN → Mint 1 BRWIN token to player
   └── LOSE → No reward

7. POST-BATTLE
   ├── Mark NFT as used in database
   ├── Deselect NFT from profile
   ├── Update quest progress
   └── Refresh inventory
```

### Battle Simulation (On-Chain)

The battle is simulated in the smart contract:

```solidity
function simulate(uint256 hp, uint256 attack) internal view returns (bool) {
    uint256 eHp = 25;    // Enemy HP
    uint256 eAtk = 5;    // Enemy Attack

    while (true) {
        // Player attacks first
        if (attack >= eHp) return true;  // WIN
        eHp -= attack;

        // Enemy attacks
        if (eAtk >= hp) return false;    // LOSE
        hp -= eAtk;
    }
}
```

### Battle Fee
- **Cost**: 5 IDRX per battle
- **IDRX Decimals**: 2 (so 5 IDRX = 500 in contract)
- **Destination**: BattleBank contract

---

## 🎨 NFT System

### Character Stats

Each NFT has unique stats stored off-chain but verified on-chain via Merkle proofs:

```json
{
  "tokenId": 1,
  "hp": 156,
  "attack": 15
}
```

### Rarity Distribution

| Rarity | HP Range | ATK Range | Win Probability |
|--------|----------|-----------|-----------------|
| Common | 100-150 | 8-15 | ~40-50% |
| Rare | 140-180 | 15-25 | ~50-60% |
| Epic | 170-220 | 22-32 | ~60-70% |
| Legendary | 200-250 | 30-40 | ~70-80% |

### NFT Contract Addresses

| Type | Contract Address | Description |
|------|------------------|-------------|
| Free Mint (Common) | `0xabab2d0A3EAF9722E3EE0840D0360c68899cB305` | Free starter NFTs |
| Rare Pack | `0x38826ec522f130354652bc16284645b0c832c341` | Purchasable rare NFTs |
| Epic Pack | `0xcA36Cf2e444C209209F0c62127fAA37ae1bE62C9` | Purchasable epic NFTs |
| Legendary Pack | `0xe199DeC5DdE8007a17BED43f1723bea41Ba5dADd` | Purchasable legendary NFTs |

### One-Time Use System

```
┌─────────────────────────────────────────────────────────┐
│                 NFT LIFECYCLE                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [MINT] ──► [AVAILABLE] ──► [BATTLE] ──► [LOCKED]     │
│                   │              │            │         │
│                   │              │            ▼         │
│              Can select     Used once    🔒 Forever    │
│              for battle                   locked       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **On-Chain**: `used[tokenId] = true` in Battle contract
- **Off-Chain**: `user_inventory.used = true` in database
- **UI**: Shows 🔒 LOCKED overlay, button disabled

---

## 💰 Token Economy

### IDRX Token
- **Purpose**: In-game currency for battle fees
- **Decimals**: 2 (like IDR currency)
- **Address**: `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22`
- **Acquisition**: QRIS top-up (Indonesia) or swap

### BRWIN Token (Base Realms Win)
- **Purpose**: Proof of victory
- **Type**: Soulbound ERC-20
- **Address**: `0xB5d282f7abC8901a0B70d02442be81366831eB2d`
- **Reward**: 1 BRWIN per battle won
- **Transfer**: ❌ Cannot be transferred (soulbound)

```solidity
// Soulbound implementation
function _update(address from, address to, uint256 value) internal override {
    require(from == address(0) || to == address(0), "Soulbound");
    super._update(from, to, value);
}
```

---

## 🔐 Security: Merkle Proof Verification

### Why Merkle Proofs?

To prevent cheating, NFT stats (HP, ATK) are NOT stored on-chain (gas expensive). Instead:

1. **Off-Chain Storage**: Stats stored in `stats.json`
2. **Merkle Tree**: All stats hashed into a Merkle tree
3. **Root On-Chain**: Only the Merkle root stored in contract
4. **Proof Verification**: Each battle requires a valid proof

### How It Works

```
                    Merkle Root (on-chain)
                           │
              ┌────────────┴────────────┐
              │                         │
         Hash(A+B)                 Hash(C+D)
              │                         │
        ┌─────┴─────┐             ┌─────┴─────┐
        │           │             │           │
      Leaf A     Leaf B        Leaf C     Leaf D
        │           │             │           │
   Token 1     Token 2       Token 3     Token 4
   HP:156      HP:118        HP:111      HP:123
   ATK:15      ATK:13        ATK:14      ATK:11
```

### Leaf Generation
```javascript
// Generate leaf from stats
const leaf = keccak256(abi.encodePacked(tokenId, hp, attack));
```

### Verification Process
```solidity
function verify(bytes32[] memory proof, bytes32 leaf) internal view returns (bool) {
    bytes32 hash = leaf;
    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 sibling = proof[i];
        // Sorted pairs for consistent ordering
        if (hash < sibling) {
            hash = keccak256(abi.encodePacked(hash, sibling));
        } else {
            hash = keccak256(abi.encodePacked(sibling, hash));
        }
    }
    return hash == merkleRoot;
}
```

---

## 💳 QRIS Payment Integration

### Overview

Indonesian players can top up IDRX using **QRIS** (Quick Response Code Indonesian Standard) through **Midtrans** payment gateway.

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    QRIS TOP-UP FLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. USER REQUEST
   └── Select top-up amount in app

2. CREATE PAYMENT
   ├── POST /api/qris/create
   ├── Generate unique order ID
   └── Request QRIS from Midtrans

3. DISPLAY QR CODE
   └── Show QRIS image to user

4. USER PAYS
   └── Scan QR with banking app

5. WEBHOOK CALLBACK
   ├── Midtrans calls /api/qris/webhook
   ├── Verify signature
   └── Update payment status

6. CLAIM IDRX
   ├── Generate Merkle proof for claim
   ├── User calls claim() on QRIS contract
   └── Receive IDRX tokens
```

### Supported Amounts
- Minimum: 10,000 IDR
- Maximum: 10,000,000 IDR

---

## 📋 Quest System

### Daily Quests

| Quest | Target | XP Reward |
|-------|--------|-----------|
| Play 3 Games | Complete 3 battles | 50 XP |
| Win 3 Games | Win 3 battles | 100 XP |
| Open Free Cards | Open 1 card pack | 25 XP |
| Daily Login | Login once | 10 XP |

### Quest Flow

```
[Active] ──► [Completed] ──► [Claimed]
    │             │              │
    │        Progress ≥          │
    │        Target              │
    │             │              │
Auto-track    Can claim      XP Added
via API       reward         to Profile
```

### Leveling System
- XP accumulates from quests and battles
- Level up unlocks new features
- Level displayed in profile header

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Wallet with Base network configured
- Supabase account
- Midtrans account (for QRIS - optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/base-realms.git
cd base-realms

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## 📁 Project Structure

```
base-realms/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/               # Authentication
│   │   ├── battles/            # Battle endpoints
│   │   ├── cards/              # NFT inventory
│   │   ├── leaderboard/        # Rankings
│   │   ├── player/             # Profile management
│   │   ├── qris/               # QRIS payments
│   │   └── quests/             # Quest system
│   │
│   ├── components/
│   │   ├── game/               # Game components
│   │   │   ├── BattleArena.tsx     # Battle scene
│   │   │   ├── BattlePreparation.tsx
│   │   │   ├── CharacterCanvas.tsx # Character rendering
│   │   │   ├── HeaderBar.tsx       # Top UI bar
│   │   │   ├── HomeDeckMenu.tsx    # NFT selection
│   │   │   ├── QuestMenu.tsx       # Quest UI
│   │   │   ├── ShopCardsPopup.tsx  # Card shop
│   │   │   └── ...
│   │   └── ui/                 # Reusable UI components
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useBattle.ts        # Battle logic hook
│   │   ├── useInventory.ts     # NFT inventory
│   │   ├── useQuests.ts        # Quest management
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── blockchain/         # Web3 utilities
│   │   │   ├── contracts.ts    # Contract ABIs & addresses
│   │   │   ├── battleService.ts
│   │   │   └── merkleService.ts
│   │   ├── midtrans/           # Payment integration
│   │   └── supabase/           # Database client
│   │
│   ├── stores/                 # Zustand state stores
│   │   ├── gameStore.ts        # Main game state
│   │   └── battleStore.ts      # Battle state
│   │
│   ├── home/                   # Home page
│   ├── battle/                 # Battle page
│   ├── shop/                   # Shop page
│   ├── login/                  # Login page
│   │
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   └── rootProvider.tsx        # OnchainKit provider
│
├── merkle/
│   ├── contract/               # Solidity contracts
│   │   ├── battlecon.sol       # Battle contract
│   │   ├── wintokennew.sol     # WinToken contract
│   │   └── qris.sol            # QRIS claim contract
│   ├── stats.json              # NFT stats data
│   └── generateMerkle.js       # Merkle tree generator
│
├── public/                     # Static assets
│   ├── Assets/                 # Game sprites
│   ├── building/               # Building graphics
│   └── decoration/             # Decorative elements
│
├── types/                      # TypeScript types
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## 🔧 Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OnchainKit (Coinbase)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_key

# Midtrans (QRIS - Optional)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your_midtrans_client_key

# QRIS Claim (Optional)
QRIS_CLAIM_SECRET=your_claim_secret
NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS=contract_address

# Neynar (Farcaster / Base app context, optional)
NEYNAR_API_KEY=your_neynar_api_key
```

---

## 📦 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy!

```bash
# Or use Vercel CL
npm i -g vercel
vercel --prod
```

### Build for Production

```bash
npm run build
npm start
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| React 19 | UI library |
| TypeScript | Type safety |
| Zustand | State management |
| Lucide React | Icons |

### Web3
| Technology | Purpose |
|------------|---------|
| Wagmi v2 | React hooks for Ethereum |
| Viem | TypeScript Ethereum library |
| OnchainKit | Coinbase wallet integration |
| Farcaster MiniKit | Farcaster Frame support |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database + Auth |
| Next.js API Routes | Serverless API |
| Midtrans | QRIS payment gateway |

### Blockchain
| Technology | Purpose |
|------------|---------|
| Base Network | L2 blockchain |
| Solidity | Smart contracts |
| OpenZeppelin | Contract standards |
| MerkleTreeJS | Merkle proof generation |

---

## 🎯 Game Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| NFT Minting | ✅ | Free and paid NFT mints |
| Turn-Based Battle | ✅ | On-chain battle resolution |
| Merkle Verification | ✅ | Anti-cheat stat verification |
| One-Time Use NFTs | ✅ | NFTs lock after battle |
| Soulbound Rewards | ✅ | Non-transferable win tokens |
| Quest System | ✅ | Daily quests with XP |
| Leaderboard | ✅ | Player rankings |
| QRIS Payments | ✅ | Indonesian payment support |
| Farcaster MiniApp | ✅ | Frame integration |
| Character Movement | ✅ | Pixel art world exploration |

---

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the ISC License.

---

## 🔗 Links

- **Base Network**: [https://base.org](https://base.org)
- **OnchainKit Docs**: [https://docs.base.org/onchainkit](https://docs.base.org/onchainkit)
- **Farcaster**: [https://farcaster.xyz](https://farcaster.xyz)
- **Supabase**: [https://supabase.com](https://supabase.com)

---

<div align="center">

**Built with ❤️ for the Base Ecosystem**

*Base Realms - Where NFTs Battle On-Chain*

</div>
