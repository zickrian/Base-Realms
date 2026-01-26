# ✅ MY DECK - HP & ATK STATS DISPLAY

## 🎯 **Feature Added**
Stats display di bawah gambar NFT di My Deck menu dengan icon pixel theme:
- ⚔️ **Pedang** untuk Attack (ATK)
- ❤️ **Love/Heart** untuk Health (HP)

---

## 🎨 **Visual Design**

### Before:
```
┌─────────────────────────────────┐
│         MY DECK                 │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐      │
│  │  NFT 1  │  │  NFT 2  │      │
│  │  Image  │  │  Image  │      │
│  │         │  │         │      │
│  └─────────┘  └─────────┘      │
│  [ USE ]      [SELECTED]       │
└─────────────────────────────────┘
```

### After (NEW):
```
┌─────────────────────────────────┐
│         MY DECK                 │
├─────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐      │
│  │  NFT 1  │  │  NFT 2  │      │
│  │  Image  │  │  Image  │      │
│  ├─────────┤  ├─────────┤      │
│  │⚔️ 50 ❤️100│  │⚔️ 75 ❤️ 80│      │
│  └─────────┘  └─────────┘      │
│  [ USE ]      [SELECTED]       │
└─────────────────────────────────┘
         ↑ NEW: Stats display
```

### Locked NFT:
```
┌─────────────┐
│             │
│  🔒 Used    │  ← Lock overlay on top
│             │
├─────────────┤
│⚔️ 50  ❤️ 100│  ← Stats still visible
└─────────────┘
  [ LOCKED ]
```

---

## 🔧 **Implementation**

### **File: `app/components/game/HomeDeckMenu.tsx`**

```tsx
<div className={styles.cardInner}>
  {/* NFT Image */}
  <Image
    src={item.cardTemplate.imageUrl}
    alt={item.cardTemplate.name}
    className={styles.cardImage}
    width={150}
    height={150}
  />
  
  {/* Lock Overlay (if used) */}
  {isLocked && (
    <div className={styles.lockOverlay}>
      <span className={styles.lockIcon}>🔒</span>
      <span className={styles.lockText}>Used</span>
    </div>
  )}
  
  {/* ✅ NEW: Stats Display */}
  <div className={styles.cardStats}>
    <div className={styles.statItem}>
      <span className={styles.statIcon}>⚔️</span>
      <span className={styles.statValue}>{item.cardTemplate.atk || 0}</span>
    </div>
    <div className={styles.statItem}>
      <span className={styles.statIcon}>❤️</span>
      <span className={styles.statValue}>{item.cardTemplate.health || 0}</span>
    </div>
  </div>
</div>
```

---

## 🎨 **CSS Styling** (Pixel Theme)

### **File: `app/components/game/HomeDeckMenu.module.css`**

```css
/* Card Stats Display - Below card image */
.cardStats {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.7));
    padding: 6px 4px;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    z-index: 5;
    border-top: 2px solid #8b7355;  /* Brown border */
}

.statItem {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'VT323', monospace;  /* Pixel font */
}

.statIcon {
    font-size: 18px;
    filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8));
    line-height: 1;
}

.statValue {
    font-size: 18px;
    font-weight: bold;
    color: #ffffff;
    text-shadow: 
        1px 1px 0 #000000,     /* Black outline */
        -1px -1px 0 #000000,
        1px -1px 0 #000000,
        -1px 1px 0 #000000,
        2px 2px 4px rgba(0, 0, 0, 0.8);  /* Shadow */
    min-width: 24px;
    text-align: center;
    letter-spacing: 1px;
}

/* Make cardInner relative for absolute positioning */
.cardInner {
    width: 100%;
    height: 100%;
    padding: 4px;
    position: relative;  /* ✅ NEW */
}
```

---

## 🎯 **Design Details**

### Layout Structure:
```
┌─────────────────────┐
│                     │
│   NFT Image         │  ← Main image (object-fit: contain)
│                     │
│                     │
├─────────────────────┤
│ ⚔️ 50    ❤️ 100     │  ← Stats overlay (absolute bottom)
└─────────────────────┘
   position: absolute
   bottom: 0
```

### Gradient Background:
```
rgba(0,0,0,0.7) ┐
                 │ Gradient from transparent to solid black
rgba(0,0,0,0.95)┘
```

### Text Styling:
- **Font:** VT323 (pixel/retro font)
- **Size:** 18px
- **Color:** White (#ffffff)
- **Outline:** Black 1px on all sides (for readability)
- **Shadow:** 2px drop shadow for depth

### Icon Styling:
- **Size:** 18px
- **Filter:** Drop shadow for depth
- **Icons:**
  - ⚔️ = Attack (Sword)
  - ❤️ = Health (Heart)

---

## 📊 **Examples**

### Example 1: Normal Card
```
┌─────────────────┐
│                 │
│   Fire Dragon   │
│   [Image]       │
│                 │
├─────────────────┤
│ ⚔️ 75  ❤️ 120   │
└─────────────────┘
    [ USE ]
```

**Data:**
```json
{
  "name": "Fire Dragon",
  "atk": 75,
  "health": 120,
  "used": false
}
```

---

### Example 2: Locked Card (Used)
```
┌─────────────────┐
│    🔒 Used      │  ← Dark overlay
│   Ice Knight    │
│   [Image]       │
│                 │
├─────────────────┤
│ ⚔️ 60  ❤️ 100   │  ← Stats still visible
└─────────────────┘
   [ LOCKED ]
```

**Data:**
```json
{
  "name": "Ice Knight",
  "atk": 60,
  "health": 100,
  "used": true
}
```

**Visual:**
- Lock overlay (85% opacity black) covers image
- Stats bar remains visible below
- Button shows "LOCKED" and is disabled

---

### Example 3: Selected Card
```
┌─────────────────┐
│                 │  ← Red border glow
│   Wind Mage     │
│   [Image]       │
│                 │
├─────────────────┤
│ ⚔️ 50  ❤️ 80    │
└─────────────────┘
   [SELECTED]  ← Red button
```

**Data:**
```json
{
  "name": "Wind Mage",
  "atk": 50,
  "health": 80,
  "used": false,
  "selected": true
}
```

---

## 🎮 **User Experience**

### Before:
- User tidak tahu stats NFT tanpa membuka detail
- Harus mengingat atau mencatat stats
- Sulit compare antar NFT

### After:
- ✅ Stats langsung terlihat di card
- ✅ Mudah compare: "50 ATK vs 75 ATK"
- ✅ Tidak perlu buka detail untuk lihat stats
- ✅ Visual jelas dengan icon pedang dan love
- ✅ Pixel theme sesuai dengan game aesthetic

---

## 🔍 **Testing Checklist**

### Visual Tests:
- [ ] Stats muncul di bawah semua NFT cards
- [ ] Icon ⚔️ dan ❤️ terlihat jelas
- [ ] Text putih dengan outline hitam (readable)
- [ ] Background gradient terlihat smooth
- [ ] Border coklat (#8b7355) di atas stats bar

### Functional Tests:
- [ ] Stats menampilkan nilai benar dari database
- [ ] Stats tetap terlihat pada locked NFT
- [ ] Stats tidak overlap dengan lock overlay
- [ ] Stats responsive di berbagai ukuran layar
- [ ] Font VT323 ter-load dengan benar

### Edge Cases:
- [ ] NFT dengan ATK = 0 → Shows "0"
- [ ] NFT dengan HP = 0 → Shows "0"
- [ ] NFT tanpa stats data → Shows "0" (fallback)
- [ ] Stats dengan nilai besar (999+) → Fits in width

---

## 📱 **Responsive Behavior**

### Desktop (>480px):
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│  NFT 1  │  │  NFT 2  │  │  NFT 3  │
│ [Image] │  │ [Image] │  │ [Image] │
├─────────┤  ├─────────┤  ├─────────┤
│⚔️50 ❤️100│  │⚔️75 ❤️80 │  │⚔️60 ❤️90│
└─────────┘  └─────────┘  └─────────┘
```

### Mobile (<480px):
```
┌─────────┐  ┌─────────┐
│  NFT 1  │  │  NFT 2  │
│ [Image] │  │ [Image] │
├─────────┤  ├─────────┤
│⚔️50 ❤️100│  │⚔️75 ❤️80│
└─────────┘  └─────────┘

┌─────────┐  ┌─────────┐
│  NFT 3  │  │  NFT 4  │
│ [Image] │  │ [Image] │
├─────────┤  ├─────────┤
│⚔️60 ❤️90 │  │⚔️55 ❤️95│
└─────────┘  └─────────┘
```

**Grid:** 2 columns on all screen sizes

---

## 🎨 **Color Palette**

| Element | Color | Usage |
|---------|-------|-------|
| **Stats background** | rgba(0,0,0,0.95) → 0.7 | Gradient from solid to transparent |
| **Border top** | #8b7355 | Brown border above stats |
| **Text** | #ffffff | White for contrast |
| **Text outline** | #000000 | Black for readability |
| **Icon shadow** | rgba(0,0,0,0.8) | Drop shadow for depth |

---

## ✅ **Summary**

### What's New:
1. ✅ **Stats display** added below NFT image
2. ✅ **⚔️ Icon** for Attack stat
3. ✅ **❤️ Icon** for Health stat
4. ✅ **Pixel theme** with VT323 font
5. ✅ **Dark gradient** background for readability
6. ✅ **White text** with black outline
7. ✅ **Responsive** design for all screens

### Benefits:
- User langsung lihat stats tanpa klik
- Mudah compare NFT stats
- Visual clear dengan icon
- Sesuai pixel/retro game theme
- Tetap terlihat pada locked NFT

### Files Changed:
- `app/components/game/HomeDeckMenu.tsx` - Added stats JSX
- `app/components/game/HomeDeckMenu.module.css` - Added stats styling

**Status:** ✅ **IMPLEMENTED - READY TO TEST!**

Test di browser untuk lihat visual stats display! 🚀
