🧪 PLANNING VERIFIKASI & HARDENING WALLET FLOW

(Base Account / Smart Wallet + wagmi)

TUJUAN UTAMA

Memastikan login wallet hanya terjadi sekali

Memastikan tidak ada wallet reconnect / continue dialog di tengah flow

Memastikan popup hanya muncul untuk tx valid (approve & battle)

Menjamin battle phase = wallet-free

PHASE A — WALLET CONTEXT INTEGRITY CHECK (WAJIB)
A1. Verifikasi Struktur Provider

Checklist:

 WagmiProvider HANYA ADA 1

 Diletakkan di root (app/layout.tsx)

 Tidak berada di page (/battle, /home)

 Tidak conditional render ({isMounted && <WagmiProvider>} ❌)

📌 Output yang diharapkan:
Wallet tidak pernah disconnect saat route berubah.

A2. Verifikasi createConfig

Checklist:

 createConfig() tidak dipanggil ulang

 Tidak berada di function / component body

 Tidak tergantung state / env runtime

📌 Jika config dibuat ulang → connector reset → popup “continue”.

PHASE B — CONNECTOR & CONNECT FLOW AUDIT
B1. Audit Pemanggilan connect()

Cari di codebase:

connect(

autoConnect

effect seperti:

useEffect(() => {
  if (!isConnected) connect()
}, [...])


Checklist:

 Tidak ada connect() dipanggil setelah login sukses

 Tidak ada reconnect otomatis saat route change

 Tidak ada retry logic yang silent

📌 Output: Wallet connect hanya sekali di awal.

B2. Audit useAccount, useWalletClient

Checklist:

 Tidak dipakai untuk trigger side effect

 Tidak memicu navigation / state reset

 Tidak dipakai sebagai dependency effect besar

PHASE C — ROUTING & NAVIGATION SAFETY
C1. Audit Semua Navigation

Cari:

router.push

router.replace

window.location

window.open

Checklist:

 Tidak ada redirect sebelum tx settle

 Tidak ada hard navigation (location.href)

 Navigation dilakukan SETELAH battle selesai

📌 Rule:

Jangan ganti page saat wallet masih “active”.

C2. Battle Page Lifecycle

Checklist:

 /battle tidak unmount WagmiProvider

 Battle phase tidak memicu global re-render

 Tidak ada lazy load yang membungkus provider

PHASE D — TRANSACTION FLOW VALIDATION
D1. Approve Flow

Checklist:

 Approve hanya muncul jika allowance < 5

 Setelah approve → tidak ada connect ulang

 Tidak ada dialog “continue” setelah approve

D2. Battle Flow

Checklist:

 battle() memicu 1 popup tx

 Tidak ada popup lain setelah tx confirm

 Tidak ada mint popup (mint internal)

PHASE E — POST-BATTLE WALLET-FREE ZONE
E1. Setelah battle() Confirmed

Checklist:

 Tidak ada call ke wagmi

 Tidak ada read/write contract

 Tidak ada wallet hook dipanggil ulang

 Hanya:

animasi

state lokal

API backend

📌 Ini zona steril wallet.

E2. Redirect ke Home

Checklist:

 Redirect setelah semua state siap

 Tidak memicu re-init provider

 Tidak memicu reconnect

PHASE F — LOGGING & OBSERVABILITY
F1. Tambahkan Logging Wallet Lifecycle

Log minimal:

wallet connected

connector initialized

address changed

chain changed

Checklist:

 Tidak ada “connected” log muncul 2x

 Tidak ada disconnect log di tengah battle

PHASE G — MANUAL TEST MATRIX
Scenario 1: First-time user

Login wallet

Battle

Expected:

approve popup (1)

battle popup (1)

NO continue popup

Scenario 2: Returning user (already connected)

Direct battle

Expected:

battle popup (1)

NO continue popup

Scenario 3: Refresh page

Wallet auto reconnect

No “continue” spam

RED FLAGS (HARUS 0)

❌ “Dapp wants to continue” muncul setelah login

❌ Wallet popup muncul di tengah animasi

❌ Wallet reconnect saat route change

❌ Provider re-mount