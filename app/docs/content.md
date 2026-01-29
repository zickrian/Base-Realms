# Introduction

Base Realms is a **Web3 pixel-art battle game** on the Base network. Players mint or acquire NFT characters, fight AI enemies in turn-based combat, and earn on-chain rewards. This documentation explains how the game works, how to play it, and how to run or extend the project.

The guide is structured for both players and developers: you will find step-by-step tutorials for playing, clear explanations of game mechanics and economy, and technical references for smart contracts, security (Merkle verification), QRIS payments, and deployment.

Use the **left sidebar** to jump between major sections and the **On this page** panel on the right to move within the current page.

---

## Game Overview

Base Realms combines pixel-art aesthetics with on-chain gameplay. Each character is an ERC-721 NFT on Base with unique **HP** (Health Points) and **ATK** (Attack Power). Battles are resolved entirely on-chain, and stats are verified using Merkle proofs so players cannot cheat.

**What makes it different:**

- **Pixel art and retro style** — The game uses a consistent 16-bit style with smooth animations and an explorable world (Home, Shop, Arena, Museum).
- **NFT ownership** — Characters are real NFTs on Base; you own and control them from your wallet.
- **On-chain battles** — Win or lose is determined by a smart contract, not the client. Results are transparent and auditable.
- **Anti-cheat via Merkle proofs** — HP and ATK are committed in a Merkle tree; the contract only stores the root. To battle, you submit a proof that your NFT’s stats match the tree. This keeps stats tamper-proof without storing every stat on-chain.
- **Soulbound rewards** — Winners receive BRWIN (Base Realms Win) tokens that cannot be transferred, acting as proof of victory.
- **Farcaster MiniKit** — The game can be played inside Farcaster as a MiniApp with native wallet connection.

**Core mechanic: one-time use NFTs**

Each NFT can be used in battle **only once**. After a battle (win or lose), that NFT is permanently **locked**. You must mint or acquire new NFTs to keep battling. This keeps the economy active and rewards ongoing engagement.

---

## Key Features

### NFT Character Cards

The game has **1,000 unique character NFTs** with different stats. There are **4 rarity tiers**: Common, Rare, Epic, and Legendary. Stats fall in these ranges:

- **HP**: 100–250  
- **ATK**: 8–40  

Higher rarity characters tend to have better stats and higher win probability.

### Turn-Based Combat

Battles are turn-based: you and the AI enemy take turns dealing damage based on ATK until one side’s HP reaches zero. The simulation runs **on-chain** in the Battle contract. The client shows HP bars, damage numbers, and animations, but the outcome is fixed by the contract.

The design targets roughly a **50% win rate** for balanced gameplay across rarities.

### Win Token Rewards (BRWIN)

Winners receive **BRWIN** (Base Realms Win) tokens — a soulbound ERC-20 that cannot be transferred. Each battle won mints 1 BRWIN to the player. BRWIN serves as an on-chain record of wins and can be used for future features (e.g. rankings or rewards).

### Quest System

Daily quests reward **XP**. Examples:

- **Play 3 Games** — Complete 3 battles (50 XP)  
- **Win 3 Games** — Win 3 battles (100 XP)  
- **Open Free Cards** — Open 1 free card pack (25 XP)  
- **Daily Login** — Log in once (10 XP)  

Progress is tracked via the API; when a quest reaches its target, you claim the XP. XP feeds into a level progression system shown in your profile.

### QRIS Top-Up (Indonesia)

Players in Indonesia can top up **IDRX** (in-game currency) using **QRIS** through the **Midtrans** payment gateway. You choose an amount, see a QR code, pay with your banking app, and after confirmation you claim IDRX on-chain via the QRIS Claim contract.

### Interactive World

The game world is a pixel-art environment where you move your character between locations:

- **Home** — Deck menu, character selection, quests  
- **Shop** — Mint free or paid NFT packs  
- **Arena** — Start battles  
- **Museum** — View battle history  

Movement uses walk animations and clear visual feedback.

### Farcaster MiniKit

Base Realms is built to run as a **Farcaster MiniApp**. When opened inside Farcaster, wallet connection and session handling are integrated so players can start quickly without leaving the app.

---

## How to Play

### Step 1: Connect your wallet

1. Open Base Realms (in Farcaster or at the game URL).  
2. Click **Play** on the landing page.  
3. Connect a wallet that supports the **Base** network.  
4. Your profile is created automatically when you first connect.

### Step 2: Get your first NFT

1. From Home, walk **right** to the **Shop**.  
2. Find the **Free Mint** (or free pack) option.  
3. Mint your first Common NFT.  
4. The NFT appears in your inventory and is linked to your wallet.

### Step 3: Select your fighter

1. Return to **Home**.  
2. Open the **Deck** (character or deck button).  
3. Choose an NFT that is **not** locked.  
4. Click **Use** to equip it for battle.

### Step 4: Enter battle

1. Walk to the **Arena** (building with the sword icon).  
2. Click **Battle**.  
3. Approve **IDRX** spending if prompted (battle fee is 5 IDRX).  
4. Confirm the transaction; the on-chain battle runs and the result is returned.

### Step 5: Battle outcome

- **Win** — You receive **1 BRWIN** (soulbound).  
- **Lose** — No reward.  
- **In both cases** — The NFT you used is **locked** and cannot be used again.

### Step 6: Keep playing

1. Mint or buy new NFTs from the Shop.  
2. Select a new NFT in the Deck.  
3. Enter the Arena and battle again.

**Tips:** Use higher-rarity NFTs for better stats, complete daily quests for XP, and check the Leaderboard to see how you rank.

---

## System Architecture

The app is built in layers: client (Next.js + React), API (Next.js API routes), blockchain (Base), database (Supabase), and optional payment (Midtrans for QRIS).

**Client:** Next.js 15 (App Router), React 19, TypeScript. Pages include Landing, Login, Home (world), Shop, Battle, and Docs. Wallet and chain interaction use Wagmi v2, Viem, and OnchainKit; Farcaster MiniKit handles in-frame experience.

**API:** Next.js API routes under `/api/*`: auth (login/session), cards (inventory, mint, select), battles (start, complete), quests (progress, claim), qris (create, webhook, status, proof), leaderboard, and player (profile, XP). They coordinate Supabase, contract calls, and Midtrans.

**Blockchain:** Base (Chain ID 8453). Contracts: NFT (characters), Battle (Merkle verification + battle logic), WinToken (soulbound BRWIN), BattleBank (IDRX battle fees), QRIS Claim (IDRX distribution after QRIS payment).

**Database:** Supabase (PostgreSQL) for users, profiles, inventory, battle history, quests, and QRIS payment records.

**Payment:** Midtrans for QRIS; after payment confirmation, the backend authorizes a claim and the user calls the QRIS Claim contract to receive IDRX.

---

## Smart Contracts

All contracts run on **Base Mainnet (Chain ID 8453)**.

| Contract      | Address | Role |
|---------------|---------|------|
| NFT Character | `0xabab2d0A3EAF9722E3EE0840D0360c68899cB305` | ERC-721 character NFTs (free mint) |
| Battle        | `0x4267Da4AC96635c92bbE4232A9792283A1B354F2` | Battle logic + Merkle verification |
| WinToken      | `0xB5d282f7abC8901a0B70d02442be81366831eB2d` | Soulbound BRWIN rewards |
| BattleBank    | `0x9885B2DE7b8f0169f4Ed2C17BF71bC3D5a42d684` | Receives 5 IDRX per battle |
| QRIS Claim    | `0x544596e3EFE6F407B21aA6b3430Aa8F1024fcb2a` | IDRX distribution after QRIS payment |
| IDRX Token    | `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22` | In-game currency (2 decimals) |

Additional NFT pack contracts (Rare, Epic, Legendary) have their own addresses; the app and API resolve them for minting and inventory.

---

## Battle System

### Flow (high level)

1. **Select NFT** — User picks an unused NFT from inventory.  
2. **Enter battle** — User goes to Arena and clicks Battle.  
3. **Preparation** — Client/API builds a Merkle proof for that NFT’s `(tokenId, hp, attack)` and checks IDRX balance (5 IDRX required). User approves IDRX if needed.  
4. **On-chain battle** — Contract receives `tokenId`, `hp`, `attack`, and `merkleProof`. It checks ownership, that the NFT has not been used before, and that the proof matches the stored Merkle root. It pulls 5 IDRX into BattleBank, marks the NFT as used, runs the battle simulation, and returns win/lose.  
5. **Animation** — Client plays turn-based animation based on the result.  
6. **Result** — Win mints 1 BRWIN to the player; lose gives nothing.  
7. **Post-battle** — Backend marks the NFT as used, deselects it from the profile, updates quest progress, and refreshes inventory.

### Battle simulation (on-chain)

The contract simulates turns until one side has no HP left. Example logic (conceptually):

```solidity
function simulate(uint256 hp, uint256 attack) internal view returns (bool) {
    uint256 eHp = 25;   // Enemy HP
    uint256 eAtk = 5;   // Enemy Attack

    while (true) {
        if (attack >= eHp) return true;   // Player wins
        eHp -= attack;

        if (eAtk >= hp) return false;    // Player loses
        hp -= eAtk;
    }
}
```

Actual enemy stats and order of operations are defined in the deployed Battle contract.

### Battle fee

- **Cost:** 5 IDRX per battle.  
- **IDRX decimals:** 2 (so 5 IDRX = 500 in contract units).  
- **Recipient:** BattleBank contract.

---

## NFT System

### Character stats

Each NFT has `tokenId`, `hp`, and `attack`. Stats are stored off-chain (e.g. in `stats.json`) and committed in a Merkle tree; the Battle contract stores only the Merkle root and verifies a proof per battle.

Example stat entry:

```json
{
  "tokenId": 1,
  "hp": 156,
  "attack": 15
}
```

### Rarity and win probability

| Rarity    | HP Range | ATK Range | Win probability (approx.) |
|-----------|----------|-----------|---------------------------|
| Common    | 100–150  | 8–15      | ~40–50%                   |
| Rare      | 140–180  | 15–25     | ~50–60%                   |
| Epic      | 170–220  | 22–32     | ~60–70%                   |
| Legendary | 200–250  | 30–40     | ~70–80%                   |

### One-time use and locking

After an NFT is used in a battle:

- **On-chain:** The Battle contract sets `used[tokenId] = true`.  
- **Off-chain:** The backend marks the NFT as used in the inventory.  
- **UI:** The NFT shows as locked (e.g. lock icon, use button disabled).

The NFT remains in your wallet and in the collection; it simply cannot be used for another battle.

---

## Token Economy

### IDRX

- **Role:** In-game currency for battle fees (5 IDRX per battle).  
- **Decimals:** 2 (aligned with IDR-style amounts).  
- **Address:** `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22`.  
- **How to get:** QRIS top-up (Indonesia) or swap on Base.

### BRWIN (Base Realms Win)

- **Role:** Proof of victory; 1 BRWIN per battle won.  
- **Type:** Soulbound ERC-20 (non-transferable).  
- **Address:** `0xB5d282f7abC8901a0B70d02442be81366831eB2d`.  
- **Transfer:** Disallowed except mint (to player) and burn; normal transfers revert.

Soulbound enforcement in the token contract (conceptually):

```solidity
function _update(address from, address to, uint256 value) internal override {
    require(from == address(0) || to == address(0), "Soulbound");
    super._update(from, to, value);
}
```

---

## Security: Merkle Proof Verification

### Why Merkle proofs?

Storing every NFT’s HP and ATK on-chain would be expensive. Instead, stats live off-chain and are committed in a **Merkle tree**; only the **root** is stored in the Battle contract. To battle, you provide a **Merkle proof** that your NFT’s stats are in that tree. The contract verifies the proof and then uses those stats in the simulation. This keeps the game fair and tamper-proof without paying for full on-chain storage.

### How it works

1. **Off-chain:** Build a list of leaves, one per NFT: `leaf = keccak256(abi.encodePacked(tokenId, hp, attack))`.  
2. **Merkle tree:** Hash leaves in pairs, then hash pairs, until you get a single root.  
3. **On-chain:** Store only the root in the contract.  
4. **Per battle:** Submit `(tokenId, hp, attack)` plus the sibling path (proof). The contract hashes the leaf, then hashes with each sibling up the tree; if the result equals the stored root, the stats are accepted.

Leaf generation (conceptually):

```javascript
const leaf = keccak256(abi.encodePacked(tokenId, hp, attack));
```

Verification uses sorted pairs so the same tree always produces the same root regardless of order.

---

## QRIS Payment Integration

### Overview

Indonesian players can top up IDRX using **QRIS** (Quick Response Code Indonesian Standard) via **Midtrans**. The flow is: user requests an amount → backend creates a Midtrans order and returns a QRIS code → user pays with a banking app → Midtrans sends a webhook → backend verifies and marks the payment → user claims IDRX on the QRIS Claim contract.

### Payment flow (steps)

1. **User request** — Select top-up amount in the app.  
2. **Create payment** — `POST /api/qris/create`; backend generates an order ID and requests QRIS from Midtrans.  
3. **Display QR** — App shows the QRIS image.  
4. **User pays** — User scans the QR with a banking app and completes payment.  
5. **Webhook** — Midtrans calls `POST /api/qris/webhook`; backend verifies the signature and updates payment status.  
6. **Claim IDRX** — Backend prepares a Merkle proof (or equivalent) for the claim; user calls `claim()` on the QRIS Claim contract and receives IDRX.

### Supported amounts

- Minimum: 10,000 IDR  
- Maximum: 10,000,000 IDR  

Exact limits may depend on Midtrans and contract configuration.

---

## Quest System

### Daily quests

| Quest          | Target           | XP   |
|----------------|------------------|------|
| Play 3 Games   | Complete 3 battles | 50   |
| Win 3 Games   | Win 3 battles     | 100  |
| Open Free Cards | Open 1 free pack   | 25   |
| Daily Login   | Login once         | 10   |

### Flow

Quests are **active** by default. As you play, the API updates progress (e.g. battles completed, packs opened). When progress meets the **target**, the quest becomes **completed** and you can **claim** the XP. After claiming, the XP is added to your profile and the quest is marked claimed.

Level progression is driven by total XP; your level is shown in the profile/header.

---

## Getting Started

### Prerequisites

- **Node.js** 18+  
- **npm** or **yarn**  
- A wallet with **Base** network  
- **Supabase** project (for database and optional auth)  
- **Midtrans** account (only if you need QRIS)

### Installation

```bash
git clone https://github.com/yourusername/base-realms.git
cd base-realms

npm install

cp .env.example .env.local
# Edit .env.local with your Supabase, OnchainKit, and optional Midtrans/QRIS values

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running tests

```bash
npm test
npm run test:watch
```

---

## Project Structure

Important directories:

- **`app/api/`** — API routes: `auth`, `battles`, `cards`, `leaderboard`, `player`, `qris`, `quests`, etc.  
- **`app/components/game/`** — Game UI: BattleArena, CharacterCanvas, HomeDeckMenu, QuestMenu, ShopCardsPopup, etc.  
- **`app/hooks/`** — React hooks: `useBattle`, `useInventory`, `useQuests`, etc.  
- **`app/lib/blockchain/`** — Contract ABIs, addresses, `battleService`, `merkleService`.  
- **`app/lib/midtrans/`** — Midtrans client for QRIS.  
- **`app/lib/supabase/`** — Supabase client.  
- **`app/stores/`** — Zustand stores (e.g. game state, battle state).  
- **`app/home/`**, **`app/battle/`**, **`app/shop/`**, **`app/login/`** — Main app pages.  
- **`merkle/`** — Solidity contracts (`battlecon.sol`, `wintokennew.sol`, `qris.sol`), `stats.json`, and Merkle tree generation scripts.  
- **`public/`** — Static assets (sprites, buildings, decorations).

---

## Environment Variables

Create `.env.local` and fill in at least the required values:

```env
# Supabase (required for DB and optional auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OnchainKit (Coinbase / Base)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_key

# Midtrans (optional, for QRIS)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your_midtrans_client_key

# QRIS Claim contract (optional)
QRIS_CLAIM_SECRET=your_claim_secret
NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS=contract_address
```

Use `.env.example` in the repo as a template.

---

## Deployment

### Vercel

1. Push the repo to GitHub.  
2. Import the project in Vercel and connect the repository.  
3. Add all required (and optional) environment variables.  
4. Deploy; Vercel will run `npm run build` and serve the app.

Or with the Vercel CLI:

```bash
npm i -g vercel
vercel --prod
```

### Production build (self-hosted)

```bash
npm run build
npm start
```

Ensure Node.js and any reverse proxy (e.g. Nginx) are configured for a Node server and that env vars are set in the production environment.

---

## Tech Stack

| Layer     | Technology        | Purpose                          |
|----------|--------------------|----------------------------------|
| Frontend | Next.js 15         | App Router, API routes          |
|          | React 19           | UI                               |
|          | TypeScript         | Types                            |
|          | Zustand            | State                            |
|          | Lucide React       | Icons                            |
| Web3     | Wagmi v2           | Ethereum hooks                   |
|          | Viem               | Chain interaction                |
|          | OnchainKit         | Coinbase/Base wallet             |
|          | Farcaster MiniKit  | MiniApp in Farcaster             |
| Backend  | Supabase           | PostgreSQL, auth                |
|          | Next.js API Routes| Serverless API                   |
|          | Midtrans           | QRIS payments                    |
| Chain    | Base               | L2 blockchain                    |
|          | Solidity           | Smart contracts                   |
|          | OpenZeppelin       | ERC-20/721 and utilities         |
|          | MerkleTreeJS       | Merkle tree and proof generation |

---

## License

This project is licensed under the **ISC License**.

For more: [Base](https://base.org), [OnchainKit](https://docs.base.org/onchainkit), [Farcaster](https://farcaster.xyz), [Supabase](https://supabase.com).
