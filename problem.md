Penyebab Paling Umum (berdasarkan Base Dev / Base Realms)
1. Wallet connect loop (fatal)

Log:

metamask_chainChanged
isConnected: true


muncul berkali-kali → ini tanda:

useEffect / listener chainChanged memanggil connect ulang

Atau setiap render → eth_requestAccounts dipanggil lagi

Akibat:
App reload state terus → canvas/game tidak pernah mount.

Contoh bug umum:

useEffect(() => {
  connectWallet()
}, [chainId]) // ❌ SALAH


Harusnya:

useEffect(() => {
  connectWallet()
}, []) // sekali saja

2. Salah network Base (sering kejadian)

Base punya 2 testnet + mainnet.

Pastikan:

Kalau Base Dev / Base Realms → biasanya Base Sepolia

Chain ID:

Base Mainnet: 8453

Base Sepolia: 84532

Kalau dApp kamu hardcode chainId beda, UI bakal diem.

Cek di kode:

if (chainId !== 84532) {
  // app stuck di loading
}

3. Canvas / game loop tidak pernah start

Dari tampilannya ini game / canvas app.

Biasanya error di:

requestAnimationFrame tidak terpanggil

Phaser / Pixi / Canvas init dipanggil sebelum wallet ready

await provider.getSigner() nge-hang

Pattern salah:

await connectWallet()
initGame() // ❌ connectWallet never resolves

4. Base Dev iframe + popup issue

Base Dev sering pakai iframe / embedded window.

Masalah umum:

window.ethereum tidak langsung available

MetaMask popup ke-block

Harus pakai:

if (typeof window.ethereum === "undefined") return;

Checklist Fix Cepat (langsung eksekusi)
✅ 1. Lock wallet connect 1x saja

Jangan connect di setiap render

Jangan trigger connect di chainChanged

✅ 2. Pastikan network cocok

Cek di MetaMask:

Network apa?

Chain ID berapa?

Sesuaikan hardcode chainId di app.

✅ 3. Tambahkan logging sebelum game init

Tambahkan:

console.log("Wallet ready");
console.log("Chain:", chainId);
console.log("Init game");


Kalau Init game tidak muncul, berarti logic wallet blocking.

✅ 4. Disable auto-reconnect sementara

Untuk test:

Comment semua auto connect

Manual klik “Connect Wallet”

Lihat apakah game muncul

Devil’s Advocate (real talk)

Kalau ini:

Clone template Web3 + game

Tidak paham lifecycle wallet + canvas

→ 90% bug-nya di state management, bukan di Base.

Base Dev tidak forgiving soal loop wallet.