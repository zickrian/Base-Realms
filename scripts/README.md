# Upload Assets to Supabase Storage

Script ini digunakan untuk mengupload semua gambar dari folder `public` ke Supabase Storage bucket "assets".

## Prerequisites

1. Install dependencies:
```bash
npm install @supabase/supabase-js dotenv
```

2. Buat file `.env.local` di root project dengan content:
```
NEXT_PUBLIC_SUPABASE_URL=https://htdiytcpgyawxzpitlll.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Untuk mendapatkan `SUPABASE_SERVICE_ROLE_KEY`:
- Buka Supabase Dashboard
- Settings > API
- Copy "service_role" key (JANGAN gunakan anon key)

## Usage

Jalankan script:
```bash
node scripts/upload-assets.js
```

Script akan:
- Upload semua 25 file gambar ke Supabase Storage
- Maintain struktur folder yang sama seperti di `public`
- Overwrite file jika sudah ada (upsert)

## Files yang akan diupload

- Root files: `background.png`, `backround.png`, `logos_demo.png`
- Game icons: Semua file di `game/icons/` (22 files)

## Notes

- Pastikan bucket "assets" sudah dibuat di Supabase (sudah dibuat via migration)
- Pastikan public access policy sudah di-setup (sudah dibuat via migration)
- File akan diupload dengan path yang sama seperti di folder public

