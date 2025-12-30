# Wallet Connection Flow Documentation

## Alur Flow yang Benar

### 1. Landing Page (/)
**State: Not Connected**
- Tampilkan form "Connect & Play"
- User klik tombol connect wallet

### 2. Connecting State
**State: isConnecting = true**
- Tampilkan loading screen dengan message: "Connecting wallet..."
- Wallet modal muncul, user approve connection

### 3. Fetching Data State
**State: isConnected = true, isInitialized = false, isLoading = true**
- Setelah wallet connected, otomatis mulai fetch data
- Tampilkan loading screen dengan messages:
  - "Loading your profile..."
  - "Loading quests and inventory..."
  - "Almost ready..."
- Fetch dilakukan di `page.tsx` (bukan di `LandingContent.tsx`)
- Semua data di-fetch parallel: profile, quests, settings, card packs, inventory

### 4. Ready State
**State: isConnected = true, isInitialized = true, isLoading = false**
- Tampilkan message: "Ready! Entering game..."
- Otomatis redirect ke `/home`
- Home page langsung tampil dengan semua data sudah ready

### 5. Logout State
**State: isConnected = false**
- Store di-reset (semua data dihapus)
- Redirect ke landing page
- Tampilkan form "Connect & Play" lagi

## Komponen dan Tanggung Jawabnya

### app/page.tsx
**Tanggung Jawab:**
- Handle wallet connection state
- Trigger data fetching saat wallet connected
- Handle logout dan reset store
- Redirect ke `/home` saat data ready
- Render `LandingContent` component

**TIDAK melakukan:**
- Tidak render conditional components (HomeRedirect, LoadingState)
- Tidak handle UI states (diserahkan ke LandingContent)

### app/components/LandingContent.tsx
**Tanggung Jawab:**
- Render UI berdasarkan state
- Tampilkan loading screen saat connecting/fetching
- Tampilkan connect form saat not connected
- Update loading messages

**TIDAK melakukan:**
- Tidak fetch data (dilakukan di page.tsx)
- Tidak redirect (dilakukan di page.tsx)
- Tidak handle wallet connection logic

### app/home/page.tsx
**Tanggung Jawab:**
- Render game UI
- Redirect ke `/` jika not connected atau not initialized
- Handle game logic (battles, quests, etc.)

**TIDAK melakukan:**
- Tidak fetch initial data (sudah di-fetch di page.tsx)
- Hanya refresh data saat diperlukan (after mint, claim, etc.)

### app/stores/gameStore.ts
**Tanggung Jawab:**
- Store semua game data (profile, quests, settings, etc.)
- Provide `initializeGameData()` untuk fetch semua data
- Provide `reset()` untuk clear data saat logout
- Set `isInitialized = true` HANYA setelah semua data ready

## Rules

### ✅ DO:
1. Fetch data di `page.tsx` saat wallet connected
2. Tunggu semua data ready sebelum redirect ke home
3. Reset store saat logout
4. Tampilkan loading messages yang jelas
5. Handle error dan retry

### ❌ DON'T:
1. Jangan fetch data di multiple places (hanya di page.tsx)
2. Jangan redirect sebelum data ready
3. Jangan tampilkan home page sebelum isInitialized = true
4. Jangan buat duplicate fetch logic
5. Jangan lupa reset store saat logout

## Testing Checklist

- [ ] Connect wallet → Loading → Home (semua data ready)
- [ ] Tidak ada "connect wallet lagi" di tengah jalan
- [ ] Logout → Kembali ke form login
- [ ] Refresh page saat di home → Redirect ke landing (karena store reset)
- [ ] Error saat fetch → Tampilkan error message dan bisa retry
- [ ] Loading messages muncul dengan urutan yang benar

## Common Issues

### Issue: "Connect wallet lagi di tengah jalan"
**Cause:** Data belum ready tapi sudah redirect ke home
**Solution:** Pastikan redirect hanya terjadi saat `isInitialized && !isLoading`

### Issue: "Home page muncul tapi data belum ada"
**Cause:** `isInitialized` di-set true terlalu cepat
**Solution:** Set `isInitialized = true` HANYA setelah semua data di-set di store

### Issue: "Stuck di loading screen"
**Cause:** Fetch error atau isInitialized tidak pernah jadi true
**Solution:** Check console error, pastikan API response OK, handle error dengan retry

### Issue: "Setelah logout masih ada data"
**Cause:** Store tidak di-reset
**Solution:** Call `reset()` saat wallet disconnected
