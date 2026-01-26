# ✅ NFT AUTO-DESELECTION AFTER BATTLE

## 🎯 **Requirement**
After successful battle (win or lose):
1. NFT is marked as `used = true` in database ✅
2. NFT is automatically **deselected** (lepas dari selected) ✅
3. User MUST select a different NFT for next battle ✅
4. Used NFT shows as **LOCKED** in deck menu ✅

---

## 🔄 **Complete Battle Flow**

```
User selects NFT → Battle → Approval → Execute Battle → On-Chain Battle
    ↓                                                           ↓
Selected Card                                              Win/Lose
    ↓                                                           ↓
profile.selectedCard = NFT                              Mark NFT as used
                                                                ↓
                                                        user_inventory.used = true
                                                                ↓
                                                        🔥 DESELECT NFT 🔥
                                                        profile.selectedCard = null
                                                                ↓
                                                        Refresh inventory + profile
                                                                ↓
                                                        Navigate to home
                                                                ↓
                                                        NFT shows 🔒 LOCKED
```

---

## 🔧 **Implementation**

### 1️⃣ **Mark NFT as Used**
**File:** `app/api/cards/mark-used/route.ts`

```typescript
export async function POST(request: Request) {
  const { tokenId } = await request.json();
  
  // Update database
  await supabaseAdmin
    .from('user_inventory')
    .update({ used: true })  // ✅ Set used flag
    .eq('user_id', user.id)
    .eq('token_id', tokenId);
}
```

**Called from:** `app/hooks/useBattle.ts`
```typescript
const markAsUsed = async (tokenId: number) => {
  await fetch('/api/cards/mark-used', {
    method: 'POST',
    body: JSON.stringify({ tokenId }),
  });
};
```

---

### 2️⃣ **Deselect NFT After Battle**
**File:** `app/battle/page.tsx` (lines 180-182)

```typescript
const handleBattleEnd = async () => {
  // ... battle execution ...
  
  // Mark NFT as used in database
  await markAsUsed(tokenId);
  
  // 🔥 DESELECT THE USED NFT 🔥
  console.log('[BattlePage] Deselecting used NFT...');
  await selectCard(address, null);  // ✅ Set selectedCard = null
  
  // Refresh data
  await Promise.all([
    refreshInventory(address),   // ✅ Get updated inventory with used=true
    refreshProfile(address),      // ✅ Get updated profile with selectedCard=null
  ]);
  
  console.log('[BattlePage] NFT deselected');
  
  // Navigate home
  router.replace('/home');
};
```

**What `selectCard(address, null)` does:**

**File:** `app/stores/gameStore.ts`
```typescript
selectCard: async (walletAddress: string, cardTemplateId: string | null) => {
  // Call API to deselect
  const response = await fetch('/api/cards/select', {
    method: 'POST',
    body: JSON.stringify({ cardTemplateId: null }),  // null = deselect
  });
  
  // Update local state
  set({
    profile: {
      ...currentProfile,
      selectedCardId: null,          // ✅ Clear selected ID
      selectedCard: null,            // ✅ Clear selected card
    },
  });
}
```

---

### 3️⃣ **Show NFT as LOCKED in Deck**
**File:** `app/components/game/HomeDeckMenu.tsx`

```typescript
{inventory.map((item) => {
  const isSelected = profile?.selectedCardId === item.cardTemplate.id;
  const isUsed = item.used === true;        // ✅ Check used flag
  const isLocked = isUsed;                  // ✅ Locked if used
  
  return (
    <div key={item.id}>
      {/* Card Image */}
      <Image src={item.cardTemplate.imageUrl} />
      
      {/* 🔒 Lock Overlay for Used NFTs */}
      {isLocked && (
        <div className={styles.lockOverlay}>
          <span className={styles.lockIcon}>🔒</span>
          <span className={styles.lockText}>Used</span>
        </div>
      )}
      
      {/* Button */}
      <button
        disabled={isLocked}                   // ✅ Disable button
        title={isLocked ? 'This NFT has been used in battle and is permanently locked' : ''}
      >
        {isLocked ? 'LOCKED' : 'USE'}
      </button>
    </div>
  );
})}
```

**CSS Styling:**
```css
.lockOverlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.lockIcon {
  font-size: 48px;
  margin-bottom: 8px;
}

.lockText {
  font-size: 16px;
  color: #ff4444;
  text-transform: uppercase;
}

.useButtonLocked {
  background: #666 !important;
  cursor: not-allowed !important;
  opacity: 0.5;
}
```

---

## 🎯 **Test Scenarios**

### ✅ **Scenario 1: First Battle (Win)**
**Steps:**
1. User has 3 NFTs: NFT A, NFT B, NFT C
2. User selects **NFT A** → `profile.selectedCard = NFT A`
3. User clicks Battle → Approval → Execute Battle
4. Battle result: **WIN** 🎉
5. On-chain: WinToken minted, NFT A marked used
6. Database: `user_inventory.used = true` for NFT A
7. **Auto-deselect:** `selectCard(address, null)` called
8. **Result:** `profile.selectedCard = null`
9. Navigate to home
10. NFT A shows **🔒 LOCKED**
11. User can only select NFT B or NFT C

**Expected State After:**
```json
{
  "inventory": [
    { "id": "nft-a", "used": true, "cardTemplate": {...} },   // 🔒 LOCKED
    { "id": "nft-b", "used": false, "cardTemplate": {...} },  // Available
    { "id": "nft-c", "used": false, "cardTemplate": {...} }   // Available
  ],
  "profile": {
    "selectedCardId": null,        // ✅ Deselected
    "selectedCard": null           // ✅ Deselected
  }
}
```

---

### ✅ **Scenario 2: Second Battle (Lose)**
**Steps:**
1. After first battle, user selects **NFT B**
2. User clicks Battle → Approval → Execute Battle
3. Battle result: **LOSE** 😢
4. On-chain: No WinToken, NFT B marked used, user paid 5 IDRX
5. Database: `user_inventory.used = true` for NFT B
6. **Auto-deselect:** `selectCard(address, null)` called
7. **Result:** `profile.selectedCard = null`
8. Navigate to home
9. NFT B shows **🔒 LOCKED**
10. User can only select NFT C

**Expected State After:**
```json
{
  "inventory": [
    { "id": "nft-a", "used": true, "cardTemplate": {...} },   // 🔒 LOCKED (from battle 1)
    { "id": "nft-b", "used": true, "cardTemplate": {...} },   // 🔒 LOCKED (from battle 2)
    { "id": "nft-c", "used": false, "cardTemplate": {...} }   // Available
  ],
  "profile": {
    "selectedCardId": null,        // ✅ Deselected
    "selectedCard": null           // ✅ Deselected
  }
}
```

---

### ✅ **Scenario 3: All NFTs Used**
**Steps:**
1. User battles with NFT C (last available)
2. Battle completes (win/lose)
3. All 3 NFTs now `used = true`
4. Navigate to home
5. All NFTs show **🔒 LOCKED**
6. No NFTs available to select
7. User must mint new NFTs from shop

**Expected State After:**
```json
{
  "inventory": [
    { "id": "nft-a", "used": true, "cardTemplate": {...} },   // 🔒 LOCKED
    { "id": "nft-b", "used": true, "cardTemplate": {...} },   // 🔒 LOCKED
    { "id": "nft-c", "used": true, "cardTemplate": {...} }    // 🔒 LOCKED
  ],
  "profile": {
    "selectedCardId": null,        // ✅ No selection
    "selectedCard": null           // ✅ No selection
  }
}
```

**UI Shows:**
```
┌─────────────────────────────────┐
│         MY DECK                 │
├─────────────────────────────────┤
│  [🔒]  [🔒]  [🔒]              │
│ LOCKED LOCKED LOCKED            │
│                                 │
│ All your NFTs have been used.   │
│ Visit the Shop to get more!     │
└─────────────────────────────────┘
```

---

## 🔍 **Debugging**

### Check Console Logs
When battle completes, you should see:

```
[BattlePage] Visual battle ended, executing on-chain transaction...
[BattlePage] On-chain battle executed successfully
[useBattle] Marking NFT as used: 123
[BattlePage] Deselecting used NFT...            ✅ THIS IS CRITICAL
[GameStore] Selecting card: null                ✅ Deselect called
[API] Card deselected successfully
[GameStore] Inventory refreshed: 3 cards        ✅ Fresh data
[GameStore] Profile refreshed                   ✅ Fresh data
[BattlePage] Post-battle processing complete, NFT deselected
```

### Check State in Browser DevTools

**Before Battle:**
```javascript
// In React DevTools → GameStore
profile.selectedCard = {
  id: "nft-a",
  token_id: 123,
  used: false,
  // ...
}
```

**After Battle:**
```javascript
// In React DevTools → GameStore
profile.selectedCard = null  // ✅ Deselected
```

**Check Database:**
```sql
SELECT id, token_id, used FROM user_inventory 
WHERE user_id = '<user-id>';

-- Result:
-- | id     | token_id | used  |
-- |--------|----------|-------|
-- | nft-a  | 123      | true  | ✅ Marked as used
-- | nft-b  | 456      | false |
-- | nft-c  | 789      | false |
```

---

## ✅ **Summary**

| Step | Action | Result |
|------|--------|--------|
| 1 | User selects NFT A | `profile.selectedCard = NFT A` |
| 2 | Battle executes (win/lose) | On-chain battle + payment |
| 3 | Mark as used | `user_inventory.used = true` |
| 4 | **Deselect NFT** | `selectCard(address, null)` |
| 5 | Update state | `profile.selectedCard = null` |
| 6 | Refresh inventory | Load fresh data with `used=true` |
| 7 | Navigate home | User sees NFT as 🔒 LOCKED |
| 8 | Select next NFT | Must choose different NFT |

**Key Implementation:**
```typescript
// In battle/page.tsx handleBattleEnd()
await markAsUsed(tokenId);
await selectCard(address, null);  // 🔥 AUTO-DESELECT
await refreshInventory(address);
await refreshProfile(address);
```

**Result:**
- ✅ NFT automatically deselected after battle
- ✅ User must choose new NFT
- ✅ Used NFT shows as LOCKED
- ✅ Cannot reuse locked NFT
- ✅ Flow is automatic, no user action needed

**Testing:** 🚀
Test with real battle and check console logs + UI state!
