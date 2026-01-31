# Introduction

Base Realms is a **Web3 pixel-art battle game** on the Base network. Players mint or acquire NFT characters, fight AI enemies in turn-based combat, and earn on-chain rewards. This documentation explains how the game works, how to play it, and how to run or extend the project.

**Who this is for:** Players who want a full walkthrough (login, movement, deck, shop, battle, QRIS) and developers who need technical details (contracts, API, Merkle, env vars, deployment). The guide is structured so you can read top-to-bottom or jump to a section from the **left sidebar**. Use the **On this page** panel on the right to move within the current page.

**What you will find:** Step-by-step tutorials for playing (including movement: left-click to move left, right-click to move right), clear explanations of game mechanics and economy, how the app works as a **Base app** and **Farcaster MiniApp** (we have registered it in the **Farcaster manifest** at Farcaster.xyz developer tools), and technical references for smart contracts, security (Merkle verification), QRIS payments, and deployment.

---

## Game Overview

Base Realms combines pixel-art aesthetics with on-chain gameplay. Each character is an ERC-721 NFT on Base with unique **HP** (Health Points) and **ATK** (Attack Power). Battles are resolved entirely on-chain, and stats are verified using Merkle proofs so players cannot cheat.

**What makes it different:**

- **Pixel art and retro style** — The game uses a consistent 16-bit style with smooth animations and an explorable world (Home, Shop, Arena, Museum). You move your character with **left-click to walk left** and **right-click to walk right**; the camera follows and your position is saved in the session.
- **NFT ownership** — Characters are real NFTs on Base; you own and control them from your wallet. You mint or acquire them from the Shop (free pack or paid packs) and select one in the Deck before each battle.
- **On-chain battles** — Win or lose is determined by a smart contract, not the client. Results are transparent and auditable. Each battle costs **5 IDRX**; you need a wallet on Base and a small amount of ETH for gas.
- **Anti-cheat via Merkle proofs** — HP and ATK are committed in a Merkle tree; the contract only stores the root. To battle, you submit a proof that your NFT’s stats match the tree. This keeps stats tamper-proof without storing every stat on-chain.
- **Soulbound rewards** — Winners receive BRWIN (Base Realms Win) tokens that cannot be transferred, acting as proof of victory. One BRWIN per battle won.
- **Base app + Farcaster** — We have registered the app in the **Farcaster manifest** at **Farcaster.xyz developer tools** (MiniApp manifest). That Farcaster manifest registration makes the game a **Base app** (discoverable and launchable from the Base ecosystem, e.g. Base.org) and also a **Farcaster MiniApp** (runnable inside Farcaster). So it is **not** Farcaster-only: users can open it from Base, from Farcaster, or by URL; wallet and session handling work for all three.

**Core mechanic: one-time use NFTs**

Each NFT can be used in battle **only once**. After a battle (win or lose), that NFT is permanently **locked**. You must mint or acquire new NFTs to keep battling. This keeps the economy active and rewards ongoing engagement. Locked NFTs remain in your wallet and in the collection; they simply cannot be used again in battle.

---

## Key Features

### NFT Character Cards

The game has **1,000 unique character NFTs** with different stats. There are **4 rarity tiers**: Common, Rare, Epic, and Legendary. Stats fall in these ranges:

- **HP**: 100–250  
- **ATK**: 8–40  

Higher rarity characters tend to have better stats and higher win probability. Each NFT is identified by a `tokenId`; its HP and ATK are stored off-chain and committed in a Merkle tree so the Battle contract can verify them with a proof. You get NFTs by minting from the Shop (free pack or paid packs); each NFT can be used in battle only once, then it is locked.

### Turn-Based Combat

Battles are turn-based: you and the AI enemy take turns dealing damage based on ATK until one side’s HP reaches zero. The simulation runs **on-chain** in the Battle contract. The client shows HP bars, damage numbers, and animations, but the outcome is fixed by the contract. You must have a card selected in the Deck, 5 IDRX for the battle fee, and the NFT must not already be used. The contract verifies your NFT’s stats via a Merkle proof, pulls 5 IDRX into the BattleBank, marks the NFT as used, runs the simulation, and returns win or lose. The design targets roughly a **50% win rate** for balanced gameplay across rarities.

### Win Token Rewards (BRWIN)

Winners receive **BRWIN** (Base Realms Win) tokens — a soulbound ERC-20 that cannot be transferred. Each battle won mints 1 BRWIN to the player. BRWIN serves as an on-chain record of wins and can be used for future features (e.g. rankings or rewards).

### Quest System

Daily quests reward **XP**. Examples:

- **Play 3 Games** — Complete 3 battles (50 XP)  
- **Win 3 Games** — Win 3 battles (100 XP)  
- **Open Free Cards** — Open 1 free card pack (25 XP)  
- **Daily Login** — Log in once (10 XP)  

Progress is tracked via the API; when a quest reaches its target, you see a **Claim** button and tap it to receive the XP. XP feeds into a level progression system shown in your profile. Quests are available from the **Questboard** building on Home; open it by walking to the Questboard and tapping **Go**.

### QRIS Top-Up (Indonesia)

Players in Indonesia can top up **IDRX** (in-game currency) using **QRIS** through the **Midtrans** payment gateway. You choose an amount (within supported limits, e.g. 10,000–10,000,000 IDR), see a QR code, pay with your banking or e-wallet app, and after the backend confirms the payment you claim IDRX on-chain via the QRIS Claim contract (you pay a small ETH gas fee for the claim). QRIS top-up is available from the **ATM** building on Home or from the “Insufficient IDRX” popup when you try to battle without enough IDRX.

### Interactive World

The game world is a pixel-art environment where you move your character between locations:

- **Home** — Deck menu, character selection, quests  
- **Shop** — Mint free or paid NFT packs  
- **Arena** — Start battles  
- **Museum** — View battle history  

**Movement controls (desktop):**

- **Left-click** (or tap on the left side of the ground) — Your character **walks left**.  
- **Right-click** (or tap on the right side of the ground) — Your character **walks right**.  

The camera follows your character so the world scrolls. Movement uses walk animations and clear visual feedback. Your position is saved in the session so when you return to Home, your location is restored.

### Farcaster and Base app

Base Realms is **not** a Farcaster-only app. It is a **Base app** and also a **Farcaster MiniApp**. In the developer documentation, this is explained as follows: **we have registered the app in the Farcaster manifest** at **Farcaster.xyz developer tools** (MiniApp manifest). That registration is **Farcaster’s manifest**, not a separate “Base app manifest.” The same Farcaster manifest is used by both ecosystems:

1. **Base app** — Base’s ecosystem (e.g. Base.org app directory) uses the **Farcaster manifest** and the `/.well-known/farcaster.json` endpoint (including `accountAssociation`) to discover and launch apps. Because we registered our app in the **Farcaster manifest** at Farcaster.xyz developer tools, Base Realms is **discoverable and launchable from the Base ecosystem**. Users can open the game **from Base** without opening Farcaster.
2. **Farcaster MiniApp** — The **same Farcaster manifest** allows the app to run **inside Farcaster** (e.g. from a frame or MiniApp link), with Farcaster’s embedded wallet and session handling.

**What this means in practice:**

- **As a Base app:** Open Base Realms from Base (e.g. Base.org). You get the same game: landing page, then Play → connect wallet on Base → play. No Farcaster client required.
- **As a Farcaster MiniApp:** Open from Farcaster; the game runs inside the Farcaster client. Same game logic, same wallet-on-Base; only the entry point is different.
- **As a direct URL:** Go to **baserealms.app** and tap **Play**. Same flow again.

**Summary:** The app is **not** “Farcaster only.” We registered it in the **Farcaster manifest** (Farcaster.xyz developer tools). That makes it a **Base app** (discoverable from Base) and a **Farcaster MiniApp**. All three entry points (Base app, Farcaster, direct URL) use the same wallet-on-Base flow and the same game logic.

---

## How to Play

### Step 1: Connect your wallet

1. Open Base Realms (as a Base app, from Farcaster, or at the game URL — see **Complete Step-by-Step Player Guide**).  
2. Click **Play** on the landing page.  
3. Connect a wallet that supports the **Base** network (e.g. Coinbase Wallet or MetaMask with Base added).  
4. Your profile is created automatically when you first connect. The app initializes game data (profile, quests, inventory, etc.) and redirects you to **Home** (`/home`).

### Step 2: Get your first NFT

1. From Home, use **right-click** (or tap the ground to the right) to walk **right** toward the **Shop** building.  
2. Walk close to the Shop so the **Go** button appears; tap **Go** to open the shop page.  
3. Walk to the **Free pack** (or free mint) and tap **Go**.  
4. Mint your first Common NFT (you pay only **ETH gas**; the mint itself is free).  
5. The NFT appears in your inventory and is linked to your wallet; you can select it in the Deck for battle.

### Step 3: Select your fighter

1. Return to **Home** (left-click or tap left to walk left if needed).  
2. Walk to the **Home** building (your house) and tap **Go** to open the **Deck** menu.  
3. Choose an NFT that is **not** locked (locked cards have already been used in battle).  
4. Click **Use** to equip that NFT as your current fighter. Only one card can be selected at a time.

### Step 4: Enter battle

1. Walk to the **Seum** (Arena / colosseum) and tap **Go**.  
2. Confirm battle when prompted; you are taken to **`/battle`**.  
3. The app checks your card, IDRX balance (5 IDRX required), and Merkle proof; approve **IDRX** spending if your wallet prompts you.  
4. Confirm the battle transaction; the on-chain battle runs and the result is returned (win or lose).

### Step 5: Battle outcome

- **Win** — You receive **1 BRWIN** (soulbound).  
- **Lose** — No reward.  
- **In both cases** — The NFT you used is **locked** and cannot be used again. The app updates quest progress and refreshes your inventory.

### Step 6: Keep playing

1. Mint or buy new NFTs from the Shop (free pack or paid packs).  
2. Select a new NFT in the Deck (Home → Deck).  
3. Enter the Seum again and battle.  

**Tips:** Use higher-rarity NFTs for better stats, complete daily quests for XP (Questboard), and check the Leaderboard to see how you rank. To move: **left-click** to walk left, **right-click** to walk right.

---

## Complete Step-by-Step Player Guide

This section is a **full walkthrough** of Base Realms from first open to battle, minting, QRIS, and every screen in between. Base Realms is a **Base app** and a **Farcaster MiniApp**: we have registered it in the **Farcaster manifest** at Farcaster.xyz developer tools (see **Farcaster and Base app**). You can open it in **three ways**; in all cases you connect with a **wallet on Base** (e.g. Coinbase Wallet) and use **IDRX** for battle fees and **ETH** for gas.

---

### 1. Opening the app (Base app, Farcaster, or browser)

**As a Base app (recommended)**  
- Base Realms is registered in the **Farcaster manifest** at **Farcaster.xyz developer tools** (MiniApp manifest). That Farcaster manifest is what Base’s ecosystem uses to list and launch apps, so the game appears as a **Base app** and can be opened from the Base ecosystem (e.g. Base.org app directory or other Base app surfaces).  
- When you open it **from Base**, you get the same game: landing page (or direct into the game if the launcher deep-links). You connect your wallet on Base and play; no Farcaster client is required.  
- This is possible because the **Farcaster manifest** and the `/.well-known/farcaster.json` endpoint (including `accountAssociation`) are set up so both Base and Farcaster can validate and launch the app.

**From Farcaster**  
- You can also open Base Realms **from Farcaster** as a MiniApp (e.g. via a frame or MiniApp link).  
- The app runs inside the Farcaster client; wallet connection can use Farcaster’s embedded flow.  
- You stay in the same session when moving between Farcaster and the game.  
- Same game, same wallet-on-Base logic; only the entry point (Farcaster vs Base vs URL) is different.

**From a browser (direct URL)**  
- Go to **baserealms.app** (or your deployed URL).  
- You see the **landing page** first; tap **Play** to go to the login/connect screen.  
- No Base app directory or Farcaster needed; this is the same app and same flow once you are on the site.

**Summary:** The app is **not** Farcaster-only. We registered it in the **Farcaster manifest** (Farcaster.xyz developer tools). That makes it a **Base app** (discoverable and launchable from Base) and a Farcaster MiniApp and a direct-URL app. Everything below (login, home world, deck, shop, battle, QRIS) works the same regardless of how you opened the app.

---

### 2. Landing page (site home)

- **What you see:** Logo (Base Realms), nav links (Home, Docs, Tutorial, Economy), and a **Play** button (e.g. “Play Now”).  
- **What to do:** Click or tap **Play**. You are taken to the **login screen** (`/login`) where you connect your wallet.  
- If your wallet is **already connected**, the app may redirect you straight to **Home** (`/home`) and skip the login page.

---

### 3. Login screen – connect wallet

- **URL:** `/login`  
- **What you see:**  
  - A **Connect wallet** area (e.g. “Connect & Play” or “Try Again” if previously failed).  
  - Options to connect via **Coinbase Wallet** or “use another wallet”.  
  - If you don’t have a wallet, there is usually a link to get Coinbase Wallet.

**What to use to connect**  
- **Coinbase Wallet** (in-app or extension) – supported and integrated.  
- **Other wallets** that support Base (e.g. MetaMask) – add Base network (Chain ID **8453**) if needed.  
- **Base network is required.** The game reads your address and balance on Base; transactions (mint, battle, IDRX) happen on Base.

**What happens after you connect**  
1. The app calls **`/api/auth/login`** with your wallet address and creates or loads your account.  
2. It then **initializes game data**: profile, quests, card packs, inventory, daily pack count, current stage.  
3. You see a short **loading** state (“Connecting…”, “Initializing…”, “Loading…”).  
4. When everything is ready, you are **redirected to `/home`** (the in-game world).

If something fails (e.g. login or init), an error message appears; you can try again or reconnect the wallet.

---

### 4. Home world – first view (grass, character, buildings)

- **URL:** `/home`  
- **What you see:**  
  - **Top bar (header):** Menu (settings), **ETH** and **IDRX** balances, wallet/avatar (tap to open wallet popup).  
  - **Sky:** Clouds moving.  
  - **Ground:** Grass (tiled).  
  - **Your character:** Standing or walking on the grass.  
  - **Buildings (left to right):**  
    - **Carrot Patch** – left of ATM; plant, grow & harvest carrot NFTs (6 hour cooldown).  
    - **ATM** – Swap / top-up IDRX (and QRIS entry).  
    - **Leaderboard** – rankings.  
    - **Home** – your house; here you open the **Deck** to select a card.  
    - **Questboard** – daily quests.  
    - **Shop** – go to the shop to mint/buy NFTs.  
    - **Seum** (colosseum) – enter battle.

**Moving your character**  
- **Left-click** (or tap the ground to the **left** of your character) → character **walks left**.  
- **Right-click** (or tap the ground to the **right** of your character) → character **walks right**.  
- The **camera** follows so the world scrolls.  
- Your position is saved in the session so when you come back to Home it can restore your location.

You must **walk close to a building** to see its **“Go”** button; then tap **Go** to open the related screen (Deck, Leaderboard, Quest, Shop, Battle, or Swap).

---

### 5. Header bar (ETH, IDRX, wallet, settings)

- **Menu (top-left):** Opens **Settings**. In Settings you can **disconnect wallet** (log out); you are then sent back to the landing page.  
- **ETH and IDRX (top):**  
  - **ETH** – used for **gas** (minting NFTs, approving IDRX, battling). You need a small amount of ETH on Base.  
  - **IDRX** – in-game currency; **5 IDRX per battle**. You get IDRX via QRIS top-up or swap.  
- **Wallet/avatar (top-right):** Tap to open **Wallet popup** – copy address, view on explorer, disconnect.

---

### 6. Home building – Deck (select card for battle)

- **Where:** Walk to the **Home** building (house) and get close so the **Go** button appears.  
- **Tap Go** → **Deck menu** opens.

**Deck menu**  
- Shows your **NFT character cards** (inventory).  
- Each card shows: image, name, rarity, **HP** and **ATK**, and whether it is **locked** (already used in battle) or **available**.  
- **Select a card** that is **not locked**.  
- Tap **Use** (or equivalent) to **equip** that NFT as your current fighter.  
- Only one card can be selected at a time. You need this card selected before you can start a battle.  
- Close the Deck menu when done; your selected card is saved for the next battle.

---

### 7. ATM – Swap menu and QRIS entry

- **Where:** Walk to the **ATM** building and tap **Go**.  
- **Swap menu** opens.

**What you can do**  
- See **ETH** and **IDRX** balances.  
- **Top up IDRX via QRIS** (Indonesia): choose amount, get a QR code, pay with your bank/e-wallet app, then claim IDRX on-chain (see **QRIS** section below).  
- If there is a “swap” option, it may allow exchanging ETH for IDRX or similar (depends on app configuration).

---

### 8. Leaderboard

- **Where:** Walk to the **Leaderboard** building and tap **Go**.  
- **Leaderboard menu** opens.  
- Shows **rankings** (e.g. by wins, BRWIN, or XP).  
- Your entry may be highlighted.  
- Close when done.

---

### 9. Questboard – daily quests

- **Where:** Walk to the **Questboard** and tap **Go**.  
- **Quest menu** opens.

**What you see**  
- List of **daily quests**, e.g.:  
  - Play 3 games  
  - Win 3 games  
  - Open free cards  
  - Daily login  
- **Progress** (e.g. 1/3, 2/3).  
- **XP reward** for each quest.

**What to do**  
- Play the game (battles, mint, login) to complete objectives.  
- When a quest reaches its target, a **Claim** (or similar) button appears.  
- Tap **Claim** to receive the **XP**.  
- XP is added to your profile and used for level progression.

---

### 10. Shop – go to shop and mint NFTs

- **Where:** Walk to the **Shop** building and tap **Go**.  
- You are taken to **`/shop`** (shop page).

**Shop page**  
- Same style as Home: character on grass, camera scrolls.  
- **Buildings/points of interest:** e.g. **ATM**, **Free pack / box**, **Cashier** (paid packs).  
- Walk to the **Free pack** (or “box”) and tap **Go** to open the **card pack / mint flow**.  
- Walk to **Cashier** (or paid area) to see **paid packs** (Rare, Epic, Legendary) if available.

**Minting an NFT (step by step)**  
1. Open the **Shop** and go to the **Free pack** or the pack you want.  
2. Tap **Go** (or the pack).  
3. A **card reveal / mint** modal opens.  
4. Tap **Mint** (or equivalent).  
5. Your **wallet** (e.g. Coinbase Wallet) opens and asks you to **confirm the transaction** on Base.  
6. **Gas fee:** You pay **ETH** (gas) on Base. The mint itself can be **free** (0 IDRX/0 cost except gas). Gas cost depends on Base network congestion; usually a small fraction of ETH.  
7. After the transaction is confirmed, the **NFT is minted** to your wallet and the app **syncs your inventory**.  
8. The new card appears in your **Deck** (Home → Deck) and can be **selected for battle**.

**Free mint vs paid packs**  
- **Free pack:** One (or more) free mints per day or per account; you only pay **gas in ETH**.  
- **Paid packs:** Cost IDRX or other token; you select amount, approve spending, then mint. Gas is still paid in ETH.

---

### 11. Seum (Arena) – battle flow from start to finish

- **Where:** Walk to the **Seum** (colosseum) and tap **Go**.  
- A **battle confirmation** popup appears (e.g. “Do you want to battle?”).  
- Tap **Confirm** (or similar) → you are taken to **`/battle`**.

**Battle page – phases**

1. **Loading**  
   - Short loading screen.  
   - Then the game checks: wallet connected, **card selected**, card **not already used**.

2. **Preparation**  
   - **Merkle proof** for your NFT’s stats (HP, ATK) is generated.  
   - **IDRX balance** is checked; you need **5 IDRX**.  
   - If you have less than 5 IDRX, you may see the **QRIS top-up** popup or be redirected to get IDRX.  
   - **IDRX approval:** If the contract needs allowance, your wallet asks you to **approve IDRX** (one-time or per battle).  
   - **Network:** If you’re not on Base, the app asks you to **switch to Base** in your wallet.  
   - When everything is ready, the **Battle** button (or auto-advance) takes you to the battle phase.

3. **Battle**  
   - **On-chain battle** is executed (your NFT’s HP/ATK + Merkle proof, 5 IDRX fee).  
   - You may be asked to **confirm the battle transaction** in your wallet.  
   - The screen shows **turn-based animation** (you vs enemy, HP bars, damage).  
   - Result is **win** or **lose** (decided by the contract).

4. **Result**  
   - **Win:** You receive **1 BRWIN** (soulbound).  
   - **Lose:** No reward.  
   - **In both cases:** The NFT you used is **locked** forever (cannot be used again in battle).  
   - The app marks the card as used, updates quest progress, and refreshes inventory.

5. **After battle**  
   - You are sent back to **Home** (or a result screen first).  
   - To battle again, **select another card** in the Deck and go to the Seum again.

---

### 12. Minting NFT – gas fee and summary

- **Gas:** All on-chain actions (mint, approve IDRX, battle) use **ETH on Base** for gas.  
- **Free mint:** No IDRX cost; you only pay **ETH gas** (usually low on Base).  
- **Paid pack:** You pay the pack price (e.g. in IDRX) **plus** ETH gas.  
- **Where to mint:** **Shop** → Free pack or Cashier (paid packs).  
- **After mint:** NFT appears in your **inventory** and in the **Deck**; you can **Use** it once for battle, then it becomes **locked**.

---

### 13. QRIS – from start to end (full flow)

QRIS is for **topping up IDRX** (in-game currency) using **Indonesian Rupiah** via **QRIS** (e.g. bank/e-wallet app). It is available when the app and backend are configured for it (e.g. Midtrans).

**When you see QRIS**  
- When you try to **battle** but have **less than 5 IDRX**, the app can show an **“Insufficient IDRX”** popup with an option to **top up via QRIS**.  
- You can also open **QRIS top-up** from the **ATM / Swap** menu on Home or from a dedicated button if the app has one.

**Step-by-step QRIS flow**

1. **Choose amount**  
   - In the QRIS / top-up screen, **select an amount** (e.g. IDR 1.000 or other options).  
   - Minimum/maximum may apply (e.g. 10,000 IDR – 10,000,000 IDR).

2. **Create payment**  
   - The app calls the backend (e.g. **`/api/qris/create`**).  
   - Backend creates an order with **Midtrans** and gets a **QRIS code**.  
   - The app receives the order ID and the **QR image** (or URL) to show.

3. **Show QR code**  
   - The app displays the **QRIS code** (QR image).  
   - You open your **banking or e-wallet app** and **scan** this QR.

4. **Pay with your app**  
   - You complete the payment in **IDR** in your bank/e-wallet app.  
   - Midtrans receives the payment and notifies the game backend via **webhook** (`/api/qris/webhook`).

5. **Backend confirms**  
   - Backend verifies the webhook and **marks the order as paid**.  
   - It prepares the **claim** (e.g. Merkle proof or eligibility) so you can receive IDRX on-chain.

6. **Claim IDRX on-chain**  
   - In the app, you tap **“I’ve topped up”** or **“Refresh balance”** (or the claim button).  
   - The app checks eligibility and may call **`/api/qris/proof`** or similar to get a **claim proof**.  
   - Your **wallet** is then used to call the **QRIS Claim contract** (e.g. `claim()` or similar) on Base.  
   - You pay a small **ETH gas** fee; the contract sends **IDRX** to your wallet.

7. **Done**  
   - Your **IDRX balance** updates (in the header and in battle prep).  
   - You can now **battle** (5 IDRX per battle) or use IDRX elsewhere in the app.

**Summary**  
- Start: Open QRIS top-up (from battle popup or ATM/Swap).  
- Choose amount → see QR → pay with bank/e-wallet in IDR → backend confirms → claim IDRX on-chain with your wallet → balance updates.

---

## System Architecture

The app is built in layers: client (Next.js + React), API (Next.js API routes), blockchain (Base), database (Supabase), and optional payment (Midtrans for QRIS).

**Client:** Next.js 15 (App Router), React 19, TypeScript. Pages include Landing, Login, Home (world), Shop, Battle, and Docs. Movement: left-click to walk left, right-click to walk right; the camera follows and position is saved in the session. Wallet and chain interaction use Wagmi v2, Viem, and OnchainKit; Farcaster MiniKit handles in-frame experience when the app is opened from Farcaster. The app is registered in the **Farcaster manifest** at Farcaster.xyz developer tools, so it is a Base app and a Farcaster MiniApp.

**API:** Next.js API routes under `/api/*`: auth (login/session), cards (inventory, mint, select), battles (start, complete), quests (progress, claim), qris (create, webhook, status, proof), leaderboard, and player (profile, XP). They coordinate Supabase, contract calls, and Midtrans. The API builds Merkle proofs for battles and for QRIS claims when the backend has confirmed payment.

**Blockchain:** Base (Chain ID 8453). Contracts: NFT (characters), Battle (Merkle verification + battle logic), WinToken (soulbound BRWIN), BattleBank (IDRX battle fees), QRIS Claim (IDRX distribution after QRIS payment). All mint, approve, battle, and claim actions require ETH for gas on Base.

**Database:** Supabase (PostgreSQL) for users, profiles, inventory, battle history, quests, and QRIS payment records. The backend uses the service role key for server-side operations; the client uses the anon key where needed.

**Payment:** Midtrans for QRIS; after payment confirmation (webhook), the backend marks the order as paid and prepares the claim; the user calls the QRIS Claim contract on Base to receive IDRX (small ETH gas fee).

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

**What each contract does in short:**  
- **NFT Character:** You mint character NFTs (free mint from Shop); each has a `tokenId`; stats (HP, ATK) are off-chain and verified via Merkle proof in battle.  
- **Battle:** Accepts `tokenId`, `hp`, `attack`, and Merkle proof; checks ownership and that the NFT has not been used; pulls 5 IDRX to BattleBank; marks NFT as used; runs turn-based simulation; returns win/lose; win mints 1 BRWIN to player.  
- **WinToken (BRWIN):** Soulbound ERC-20; only mint (to player) and burn allowed; normal transfers revert.  
- **BattleBank:** Holds the 5 IDRX per battle paid by the player.  
- **QRIS Claim:** After QRIS payment is confirmed by the backend, the user calls `claim()` with a proof; the contract sends IDRX to the user’s wallet.  
- **IDRX Token:** ERC-20 with 2 decimals; used for battle fees (5 IDRX per battle); obtainable via QRIS top-up or swap.  

Additional NFT pack contracts (Rare, Epic, Legendary) have their own addresses; the app and API resolve them for minting and inventory.

---

## Battle System

### Flow (high level)

1. **Select NFT** — User picks an unused NFT from inventory in the Deck (Home → Home building → Go → Deck). Only one card can be selected; it must not be locked.  
2. **Enter battle** — User walks to the Seum (Arena), taps **Go**, confirms battle, and is taken to `/battle`.  
3. **Preparation** — Client/API builds a Merkle proof for that NFT’s `(tokenId, hp, attack)` and checks IDRX balance (5 IDRX required). User approves IDRX in the wallet if the contract needs allowance; user must be on Base network.  
4. **On-chain battle** — Contract receives `tokenId`, `hp`, `attack`, and `merkleProof`. It checks ownership, that the NFT has not been used before, and that the proof matches the stored Merkle root. It pulls 5 IDRX into BattleBank, marks the NFT as used, runs the battle simulation, and returns win/lose.  
5. **Animation** — Client plays turn-based animation based on the result (HP bars, damage numbers).  
6. **Result** — Win mints 1 BRWIN to the player; lose gives nothing. In both cases the NFT is locked.  
7. **Post-battle** — Backend marks the NFT as used, deselects it from the profile, updates quest progress, and refreshes inventory; user is sent back to Home or a result screen.

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
- If you have less than 5 IDRX, the app can show an “Insufficient IDRX” popup with an option to top up via QRIS (ATM on Home or from the popup).

---

## NFT System

### Character stats

Each NFT has `tokenId`, `hp`, and `attack`. Stats are stored off-chain (e.g. in `stats.json`) and committed in a Merkle tree; the Battle contract stores only the Merkle root and verifies a proof per battle. When you battle, the client/API builds a Merkle proof for your selected NFT’s `(tokenId, hp, attack)` and submits it to the contract; the contract hashes the leaf and verifies it against the stored root before running the simulation.

Example stat entry:

```json
{
  "tokenId": 1,
  "hp": 156,
  "attack": 15
}
```

Leaves are built as `keccak256(abi.encodePacked(tokenId, hp, attack))`; the tree is built off-chain and the root is set in the Battle contract. Updating stats requires updating the tree and the root on-chain (e.g. when new NFTs are added).

### Rarity and win probability

| Rarity    | HP Range | ATK Range | Win probability (approx.) |
|-----------|----------|-----------|---------------------------|
| Common    | 100–150  | 8–15      | ~40–50%                   |
| Rare      | 140–180  | 15–25     | ~50–60%                   |
| Epic      | 170–220  | 22–32     | ~60–70%                   |
| Legendary | 200–250  | 30–40     | ~70–80%                   |

### One-time use and locking

After an NFT is used in a battle:

- **On-chain:** The Battle contract sets `used[tokenId] = true`; any future battle with that tokenId will revert.  
- **Off-chain:** The backend marks the NFT as used in the inventory so the client shows it as locked.  
- **UI:** The NFT shows as locked (e.g. lock icon, use button disabled) in the Deck and elsewhere.

The NFT remains in your wallet and in the collection; it simply cannot be used for another battle. To battle again, you must select a different, unused NFT from the Deck.

---

## Token Economy

### IDRX

- **Role:** In-game currency for battle fees (5 IDRX per battle). You must have at least 5 IDRX to start a battle; the contract pulls 5 IDRX into the BattleBank when the battle is executed.  
- **Decimals:** 2 (aligned with IDR-style amounts).  
- **Address:** `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22`.  
- **How to get:** QRIS top-up (Indonesia) from the ATM building on Home or from the “Insufficient IDRX” popup when you try to battle; or swap on Base if available. After QRIS payment is confirmed, you claim IDRX on-chain via the QRIS Claim contract (small ETH gas fee).

### BRWIN (Base Realms Win)

- **Role:** Proof of victory; 1 BRWIN per battle won. Soulbound so it cannot be transferred; it acts as an on-chain record of wins and can be used for rankings or future features.  
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

Storing every NFT’s HP and ATK on-chain would be expensive. Instead, stats live off-chain and are committed in a **Merkle tree**; only the **root** is stored in the Battle contract. To battle, you provide a **Merkle proof** that your NFT’s stats are in that tree. The contract verifies the proof and then uses those stats in the simulation. This keeps the game fair and tamper-proof without paying for full on-chain storage. The same pattern is used for QRIS claims: the backend prepares a proof so the QRIS Claim contract can verify eligibility and send IDRX.

### How it works

1. **Off-chain:** Build a list of leaves, one per NFT: `leaf = keccak256(abi.encodePacked(tokenId, hp, attack))`.  
2. **Merkle tree:** Hash leaves in pairs, then hash pairs, until you get a single root.  
3. **On-chain:** Store only the root in the Battle contract (and similarly for QRIS Claim if applicable).  
4. **Per battle:** Submit `(tokenId, hp, attack)` plus the sibling path (proof). The contract hashes the leaf, then hashes with each sibling up the tree; if the result equals the stored root, the stats are accepted and the simulation runs.

Leaf generation (conceptually):

```javascript
const leaf = keccak256(abi.encodePacked(tokenId, hp, attack));
```

Verification uses sorted pairs so the same tree always produces the same root regardless of order. The client/API builds the proof from the off-chain stats and tree; the contract never trusts the client, only the proof against the stored root.

---

## QRIS Payment Integration

### Overview

Indonesian players can top up IDRX using **QRIS** (Quick Response Code Indonesian Standard) via **Midtrans**. The flow is: user requests an amount → backend creates a Midtrans order and returns a QRIS code → user pays with a banking or e-wallet app → Midtrans sends a webhook → backend verifies and marks the payment → user claims IDRX on the QRIS Claim contract (user pays a small ETH gas fee for the claim).

### Payment flow (steps)

1. **User request** — Select top-up amount in the app (from ATM on Home or from “Insufficient IDRX” popup when trying to battle).  
2. **Create payment** — `POST /api/qris/create`; backend generates an order ID and requests QRIS from Midtrans; app receives the QR image (or URL).  
3. **Display QR** — App shows the QRIS code (QR image).  
4. **User pays** — User scans the QR with a banking or e-wallet app and completes payment in IDR.  
5. **Webhook** — Midtrans calls `POST /api/qris/webhook`; backend verifies the signature and updates payment status; backend prepares the claim (e.g. Merkle proof or eligibility) so the user can receive IDRX on-chain.  
6. **Claim IDRX** — User taps “I’ve topped up” or “Refresh balance” (or the claim button); app may call `/api/qris/proof` or similar to get the claim proof; user’s wallet calls the QRIS Claim contract (e.g. `claim()`) on Base; user pays a small ETH gas fee; the contract sends IDRX to the user’s wallet.  
7. **Done** — IDRX balance updates in the header and in battle prep; user can battle (5 IDRX per battle) or use IDRX elsewhere.

### Supported amounts

- Minimum: 10,000 IDR  
- Maximum: 10,000,000 IDR  

Exact limits may depend on Midtrans and contract configuration. Environment variables for QRIS include `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `QRIS_CLAIM_SECRET`, and `NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS`.

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

Quests are **active** by default. As you play, the API updates progress (e.g. battles completed, packs opened, login). When progress meets the **target**, the quest becomes **completed** and a **Claim** button appears. Tap **Claim** to receive the XP; after claiming, the XP is added to your profile and the quest is marked claimed. You open the Quest menu from the **Questboard** building on Home (walk to the Questboard and tap **Go**).

Level progression is driven by total XP; your level is shown in the profile/header. Quest progress is tracked via the API; the client shows progress (e.g. 1/3, 2/3) and the XP reward for each quest.

---

## Getting Started

### Prerequisites

- **Node.js** 18+  
- **npm** or **yarn**  
- A wallet with **Base** network (e.g. Coinbase Wallet or MetaMask with Base added; Chain ID 8453)  
- **Supabase** project (for database and optional auth): you need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`  
- **OnchainKit** API key for Coinbase/Base wallet integration  
- **Midtrans** account (only if you need QRIS): server key, client key, and optional QRIS Claim contract config

### Installation

```bash
git clone https://github.com/yourusername/base-realms.git
cd base-realms

npm install

cp .env.example .env.local
# Edit .env.local with your Supabase, OnchainKit, and optional Midtrans/QRIS values

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the landing page; tap **Play** to connect your wallet and go to Home. Movement: **left-click** to walk left, **right-click** to walk right.

### Running tests

```bash
npm test
npm run test:watch
```

---

## Project Structure

Important directories:

- **`app/api/`** — API routes: `auth` (login/session), `battles` (start, complete), `cards` (inventory, mint, select), `leaderboard`, `player` (profile, XP), `qris` (create, webhook, status, proof), `quests` (progress, claim), etc. They coordinate Supabase, contract calls, and Midtrans.  
- **`app/components/game/`** — Game UI: BattleArena, CharacterCanvas (movement: left-click left, right-click right), HomeDeckMenu, QuestMenu, ShopCardsPopup, etc.  
- **`app/hooks/`** — React hooks: `useBattle`, `useInventory`, `useQuests`, etc.  
- **`app/lib/blockchain/`** — Contract ABIs, addresses, `battleService`, `merkleService` (Merkle proof generation for battles and optionally QRIS).  
- **`app/lib/midtrans/`** — Midtrans client for QRIS (create order, handle webhook).  
- **`app/lib/supabase/`** — Supabase client (anon key for client, service role for server).  
- **`app/stores/`** — Zustand stores (e.g. game state, battle state, position).  
- **`app/home/`**, **`app/battle/`**, **`app/shop/`**, **`app/login/`** — Main app pages (Home = world with buildings; Shop = shop page; Battle = battle flow; Login = connect wallet).  
- **`app/docs/`** — Documentation (this content); the app is registered in the **Farcaster manifest** at Farcaster.xyz developer tools, so it is a Base app and a Farcaster MiniApp.  
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

**What each group is for:**  
- **Supabase:** Database (users, profiles, inventory, battle history, quests, QRIS payment records). The service role key is used server-side; the anon key is used by the client where needed.  
- **OnchainKit:** Coinbase/Base wallet integration (connect, sign, send transactions on Base).  
- **Midtrans:** QRIS payment gateway; server key for backend (create order, verify webhook), client key for frontend if needed.  
- **QRIS Claim:** Backend uses the secret to generate claim proofs; the contract address is the QRIS Claim contract on Base where users call `claim()` to receive IDRX after QRIS payment.

Use `.env.example` in the repo as a template.

---

## Deployment

### Vercel

1. Push the repo to GitHub.  
2. Import the project in Vercel and connect the repository.  
3. Add all required (and optional) environment variables in the Vercel project settings: Supabase (URL, anon key, service role key), OnchainKit API key, and optionally Midtrans (server key, client key) and QRIS Claim (secret, contract address).  
4. Deploy; Vercel will run `npm run build` and serve the app. The app will be available at the Vercel URL; ensure `/.well-known/farcaster.json` is served correctly if you use the app as a Base app or Farcaster MiniApp (we registered it in the **Farcaster manifest** at Farcaster.xyz developer tools).

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

Ensure Node.js and any reverse proxy (e.g. Nginx) are configured for a Node server and that env vars are set in the production environment. If the app is listed as a Base app or Farcaster MiniApp, ensure the production URL is the one registered in the Farcaster manifest and that `/.well-known/farcaster.json` is accessible.

---

## Tech Stack

| Layer     | Technology        | Purpose                          |
|----------|--------------------|----------------------------------|
| Frontend | Next.js 15         | App Router, API routes          |
|          | React 19           | UI                               |
|          | TypeScript         | Types                            |
|          | Zustand            | State (game state, battle state, position) |
|          | Lucide React       | Icons                            |
| Web3     | Wagmi v2           | Ethereum hooks                   |
|          | Viem               | Chain interaction                |
|          | OnchainKit         | Coinbase/Base wallet             |
|          | Farcaster MiniKit  | MiniApp in Farcaster (app is also a Base app; we registered it in the Farcaster manifest at Farcaster.xyz developer tools) |
| Backend  | Supabase           | PostgreSQL, auth                |
|          | Next.js API Routes| Serverless API                   |
|          | Midtrans           | QRIS payments                    |
| Chain    | Base               | L2 blockchain                    |
|          | Solidity           | Smart contracts                   |
|          | OpenZeppelin       | ERC-20/721 and utilities         |
|          | MerkleTreeJS       | Merkle tree and proof generation |

The client handles movement with **left-click** (walk left) and **right-click** (walk right); the camera follows and position is saved in the session.

---

## Carrot Farming System

### Overview

Base Realms includes a **carrot farming mechanic** where players can plant, grow, and harvest carrot NFTs (ERC-1155). This adds a passive gameplay element alongside the battle system.

### Location

Find the **carrot patch** on the Home world:
- **Position**: Left of the ATM building (x=120px)
- Walk to the patch; when close enough (within 150px), buttons appear

### How to Farm Carrots

**1. Plant a Carrot**
- Walk to the carrot patch (left of ATM)
- Get close until the **Plant** button appears
- Tap **Plant** → carrot seed appears
- Only **ETH gas** required (no IDRX cost)

**2. Wait for Growth (6 hours)**
- Carrot enters **growing state** (visual changes)
- **Cooldown timer** appears: "5h 59m 58s..."
- **Button is hidden** during this phase
- Timer updates every second
- You can close the game; carrot keeps growing

**3. Harvest the Carrot**
- After **6 hours**, carrot becomes **harvestable** (visual change)
- Walk back to the patch
- **Harvest** button appears
- Tap **Harvest** → wallet opens

**4. Mint Carrot NFT**
- Approve transaction in wallet
- Mints **1x Carrot NFT** (ERC-1155)
- Contract: `0x1a3902fF5CfDeD81D307CA89d8b2b045Abbbe0a7`
- Token ID: 1
- Gas fee: ~$0.01-0.05 (ETH on Base)
- NFT appears in your wallet
- Carrot resets to seed state → can plant again

### Carrot States

| Visual | State | What Happens |
|--------|-------|--------------|
| Seed (small) | Empty | Plant button visible |
| Sprout (medium) | Growing | Cooldown timer: 6 hours |
| Full grown | Harvestable | Harvest button visible |

### Important Details

- **One at a time**: Can only have 1 active carrot per account
- **Growth time**: Exactly 6 hours (21,600 seconds)
- **Network**: Must be on Base (Chain ID 8453)
- **Cost**: Free to plant; only gas for harvest/mint
- **Storage**: Tracked in Supabase database with timestamps
- **NFT Type**: ERC-1155 (fungible token standard, can hold multiple)

### Future Plans 🔮

**Carrots will boost battle stats!** (Coming soon)

In a future update, carrot NFTs will provide **stat buffs** for battles:

- **Consume carrot NFTs** to boost your character
- **+HP** (Health Points) → Survive longer
- **+ATK** (Attack Power) → Deal more damage
- Buffs may be:
  - **Temporary** (lasts X battles)
  - **Permanent** (consume to upgrade NFT)
  - **Stackable** (more carrots = bigger boost)

**Strategic tip:** Start farming carrots now! Hold them for the update to power up your battle NFTs and gain an edge in combat.

### Technical Specs

- **Contract**: ERC-1155 at `0x1a3902fF5CfDeD81D307CA89d8b2b045Abbbe0a7`
- **Token ID**: 1
- **Mint Amount**: 1 per harvest
- **Growth Time**: 6 hours (server-validated)
- **Positioning**: 179px above grass, 3.6px per unit (pixel-perfect)
- **State Management**: Real-time sync with Supabase
- **API**: `/api/carrot/plant`, `/api/carrot/status`, `/api/carrot/harvest`

### Farming Tips

- 🥕 **Plant before bed** → harvest ready in morning
- 🥕 **Daily routine** → plant once per ~6 hours
- 🥕 **Check timer** → exact time remaining always visible
- 🥕 **Save NFTs** → hold for upcoming stat boost feature
- 🥕 **Gas-efficient** → Base network has low fees

### Contract Integration

When you harvest, the app calls:

```typescript
// Mint Carrot NFT (ERC-1155)
function mint(
  address account,      // Your wallet
  uint256 id,          // Token ID: 1
  uint256 amount,      // Quantity: 1
  bytes calldata data  // Empty: 0x00
) external;
```

This mints 1 carrot NFT (Token ID 1) to your wallet on Base.

---

## License

This project is licensed under the **ISC License**.

For more: [Base](https://base.org), [OnchainKit](https://docs.base.org/onchainkit), [Farcaster](https://farcaster.xyz), [Supabase](https://supabase.com).
