# Deploy Kontrak QRIS Claim by Hash (qrisHash.sol)

Kontrak ini dipakai untuk klaim IDRX setelah bayar QRIS, tanpa Merkle tree. Verifikasi pakai satu secret hash (password di env).

## 1. Siapkan secret dan hash

1. Pilih satu string rahasia (password), misalnya: `my-super-secret-qris-claim-2025`.
2. Set di `.env.local`:
   ```env
   QRIS_CLAIM_SECRET=my-super-secret-qris-claim-2025
   ```
3. Generate hash untuk constructor:
   ```bash
   node merkle/scripts/compute-claim-secret-hash.js
   ```
   Contoh output: `0x1a2b3c...` — **simpan nilai ini**; ini yang dipakai sebagai `_claimSecretHash` saat deploy.

## 2. Deploy lewat Remix

Proyek ini tidak pakai Hardhat/Foundry. Deploy bisa lewat [Remix](https://remix.ethereum.org).

### 2.1 Compile

1. Buka https://remix.ethereum.org.
2. Buat file baru, misalnya `QRISClaimHash.sol`. Copy-paste isi `merkle/contract/qrisHash.sol`.
3. Pasang dependency OpenZeppelin di Remix:
   - File Explorer → "Import from GitHub" atau buat folder `@openzeppelin/contracts`.
   - Atau: gunakan "Load from" → `https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/token/ERC20/IERC20.sol` (sesuaikan versi yang dipakai kontrak).
4. Compiler: pilih Solidity 0.8.20 (atau versi yang cocok dengan `pragma`), lalu Compile.

Cara alternatif jika import ribet: flatten kontrak dulu (gabung semua dependency jadi satu file) pakai tool seperti `hardhat flatten` di repo lain, lalu paste hasilnya ke Remix.

### 2.2 Deploy

1. Tab "Deploy & run transactions".
2. Environment: pilih "Injected Provider - MetaMask" (atau wallet lain), pastikan network **Base** (Chain ID 8453).
3. Contract: pilih `QRISClaimHash`.
4. Di kolom "Deploy" (constructor), isi:
   - `_claimSecretHash`: nilai hex dari langkah 1 (mis. `0x1a2b3c...`).
5. Klik Deploy, konfirmasi di wallet.
6. **Simpan alamat kontrak** yang muncul — ini dipakai untuk env `NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS`.

## 3. Set env setelah deploy

Di `.env.local` (dan di production):

```env
QRIS_CLAIM_SECRET=my-super-secret-qris-claim-2025
NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS=0x...   # alamat kontrak dari Remix
```

Restart dev server setelah mengubah env.

## 4. Deposit IDRX ke kontrak

Kontrak butuh IDRX untuk dibagikan ke user yang klaim.

1. Pastikan wallet owner punya IDRX (alamat IDRX di kontrak: `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22` di Base).
2. Di Remix: panggil `depositIDRX(uint256 amount)` dengan amount dalam satuan terkecil (mis. 10 IDRX = 1000 jika decimals 2). Panggil dari wallet yang jadi owner kontrak (wallet yang deploy).
3. Atau: approve IDRX ke alamat kontrak dari wallet/UI lain, lalu panggil `depositIDRX` dari owner.

Setelah itu, user yang bayar QRIS dan dapat proof dari backend bisa klaim 10 IDRX lewat frontend.

## Ringkasan

| Langkah | Yang dilakukan |
|--------|-----------------|
| 1 | Set `QRIS_CLAIM_SECRET` di .env, jalankan `node merkle/scripts/compute-claim-secret-hash.js` → dapat hex hash |
| 2 | Deploy `qrisHash.sol` di Remix (Base) dengan constructor `_claimSecretHash` = hex tadi |
| 3 | Set `NEXT_PUBLIC_QRIS_CLAIM_HASH_CONTRACT_ADDRESS` = alamat kontrak |
| 4 | Deposit IDRX ke kontrak lewat `depositIDRX(amount)` (owner) |
