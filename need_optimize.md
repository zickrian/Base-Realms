Ringkasan temuan optimisasi:
1) Optimisasi gambar
Banyak gambar memakai unoptimized, menonaktifkan optimisasi Next.js.
Beberapa gambar belum memakai lazy loading.
2) API calls berlebihan
Di home/page.tsx (baris 187-195): setelah refetchDailyPacks(), ada fetch tambahan yang tidak perlu.
Beberapa hook melakukan fetch yang bisa digabung.
3) useEffect berlebihan
Banyak useEffect yang bisa digabung atau dioptimalkan.
Beberapa dependensi tidak perlu.
4) State management
Beberapa state update bisa di-batch.
Re-render tidak perlu karena state update yang tidak optimal.
5) Bundle size
Beberapa font di-import sekaligus di layout.tsx.
Komponen berat bisa di-dynamic import.
Rekomendasi optimisasi:
Berikut temuan dan rekomendasi optimisasi:
Masalah optimisasi yang ditemukan
1. Image optimization — prioritas tinggi
Masalah:
Banyak gambar menggunakan unoptimized={true}, menonaktifkan optimisasi Next.js Image
File: BattleSection.tsx, CardRevealModal.tsx, CardsMenu.tsx, DailyPacks.tsx, HeaderBar.tsx, dll.
Dampak: Ukuran bundle lebih besar, loading lebih lambat, bandwidth lebih boros
Solusi:
// HAPUS unoptimized kecuali benar-benar diperlukan// Ganti dari:<Image src={url} unoptimized />// Menjadi:<Image   src={url}   width={60}   height={60}  loading="lazy" // untuk images below fold  priority={false} // untuk images above fold, set priority={true}/>
2. API calls berlebihan — prioritas tinggi
Masalah di app/home/page.tsx (baris 180-198):
// Setelah refetchDailyPacks(), masih fetch lagi - REDUNDANT!await refetchDailyPacks();const response = await fetch('/api/daily-packs', { ... }); // ❌ TIDAK PERLU
Solusi:
// Gunakan langsung return value dari refetchDailyPacks()const freshPackCount = await refetchDailyPacks();// Atau gunakan packCount dari hook yang sudah di-refetch
Masalah di app/stores/gameStore.ts:
Semua fetch menggunakan cache: 'no-store' — tidak ada caching
Bisa pakai cache untuk data yang jarang berubah (mis. card packs)
Solusi:
// Untuk data yang jarang berubah, gunakan cachefetch('/api/cards/packs', {  cache: 'force-cache', // atau 'default'  next: { revalidate: 300 } // revalidate setiap 5 menit})
3. useEffect berlebihan — prioritas sedang
Masalah di app/home/page.tsx:
4 useEffect terpisah yang bisa digabung atau dioptimalkan
Beberapa dependensi tidak perlu
Solusi:
// Gabungkan useEffect yang terkaituseEffect(() => {  if (!isConnected || !isInitialized || storeLoading) return;    // Prefetch routes  router.prefetch('/battle');  router.prefetch('/leaderboard');  router.prefetch('/swap');    // Prefetch leaderboard data  prefetchLeaderboard();    // Preload assets  const loadingAssets = [/* ... */];  loadingAssets.forEach((url) => {    const img = new Image();    img.src = url;  });    // Track ready state  hasEverBeenReady.current = true;}, [isConnected, isInitialized, storeLoading, router]);
4. State updates tidak optimal — prioritas sedang
Masalah di app/hooks/useInventory.ts:
Banyak state updates terpisah yang bisa di-batch
Multiple refs yang bisa disederhanakan
Solusi:
// Gunakan React 18 automatic batching atau startTransitionimport { startTransition } from 'react';startTransition(() => {  setInventory(formatted);  setError(null);  setLoading(false);});
5. Font loading — prioritas rendah
Masalah di app/layout.tsx:
4 font di-import sekaligus, meningkatkan initial bundle
Solusi:
// Gunakan font subset atau dynamic import untuk font yang jarang dipakaiconst pixelifySans = Pixelify_Sans({  variable: "--font-pixelify",  subsets: ["latin"],  weight: ["400", "500", "600", "700"],  display: 'swap', // Tambahkan untuk better performance  preload: false, // Untuk font yang jarang dipakai});
6. Image preloading — prioritas sedang
Masalah:
Preloading di beberapa tempat (HomeLoadingScreen, home/page.tsx) bisa duplikat
Beberapa gambar di-preload padahal belum diperlukan
Solusi:
// Gunakan satu centralized preloading system// Atau gunakan Next.js Image dengan priority={true} untuk critical images
7. Component memoization — prioritas rendah
Masalah:
Beberapa komponen re-render tanpa perlu (mis. DailyPacks, HeaderBar)
Solusi:
// Wrap dengan React.memo untuk prevent unnecessary re-rendersexport const DailyPacks = React.memo(function DailyPacks({ onQuestClick, onPackClick }: DailyPacksProps) {  // ...});
8. API route caching — prioritas tinggi
Masalah:
Semua API route menggunakan cache: 'no-store'
Data seperti card packs, stages bisa di-cache
Solusi:
// Di API routes, tambahkan cache headersexport async function GET(request: NextRequest) {  // ...  return NextResponse.json(data, {    headers: {      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'    }  });}
Rekomendasi prioritas
High priority (lakukan segera):
Hapus unoptimized dari Image components
Hapus redundant API call di home/page.tsx
Tambahkan caching untuk API routes yang jarang berubah
Optimalkan useEffect di home/page.tsx
Medium priority:
Batch state updates dengan startTransition
Gabungkan image preloading logic
Tambahkan React.memo untuk komponen yang sering re-render
Low priority:
Optimalkan font loading
Tambahkan service worker untuk offline caching
Lazy load komponen yang jarang dipakai
Estimasi peningkatan performa
Bundle size: -20–30% (setelah hapus unoptimized)
Initial load time: -15–25% (setelah optimisasi image & caching)
API calls: -30–40% (setelah hapus redundant calls & tambah cache)
Re-renders: -20–30% (setelah memoization)
Ingin saya buatkan patch file untuk perubahan prioritas tinggi?