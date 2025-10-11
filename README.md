## Treebox Admin – Panduan Setup

Aplikasi ini adalah sistem admin Treebox untuk menginput data pelanggan rental PlayStation. Teknologi inti: Next.js (App Router), Tailwind, dan Supabase (auth + database).

### 1. Prasyarat

- Node.js 18+
- Akun Supabase
- NPM (atau pnpm/bun/yarn)

### 2. Instalasi Dependensi

```bash
npm install
```

### 3. Konfigurasi Supabase

1. Buat project baru di [Supabase](https://supabase.com/).
2. Catat `Project URL` dan `anon public key` dari menu Project Settings → API.
3. Jalankan SQL berikut di Supabase SQL Editor untuk membuat schema dan aturan:

   ```sql
   create extension if not exists "btree_gist";

   create table if not exists public.rental_sesi (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz not null default now(),
     nama_kasir text not null,
     nama_pelanggan text not null,
     no_hp text,
     room text not null,
     qty_jam integer not null check (qty_jam > 0),
     catatan text,
     waktu_mulai timestamptz not null,
     waktu_selesai timestamptz not null,
     constraint room_waktu_unique exclude using gist (
       room with =,
       tstzrange(waktu_mulai, waktu_selesai) with &&
     )
   );

   alter table public.rental_sesi enable row level security;

   create policy "Hanya admin boleh mengelola data"
     on public.rental_sesi
     for all
     using (auth.role() = 'authenticated')
     with check (auth.role() = 'authenticated');
   ```

   Constraint `room_waktu_unique` mencegah jadwal bentrok di ruangan yang sama.

4. Buat pengguna Supabase Auth (menu Authentication) untuk akun admin.

### 4. Variabel Lingkungan

Buat file `.env.local` di root project:

```bash
NEXT_PUBLIC_SUPABASE_URL=isi_dengan_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=isi_dengan_anon_key
```

> **Catatan:** Karena aplikasi hanya dipakai admin, cukup gunakan anon key + RLS yang membatasi akses pada user login.

### 5. Menjalankan Aplikasi

```bash
npm run dev
```

Akses `http://localhost:3000`. Anda akan melihat halaman login admin (bahasa Indonesia).

### 6. Fitur Utama

- Login admin Supabase
- Form input pelanggan dengan field:
  - Nama kasir, nama pelanggan, nomor HP, ruangan, waktu mulai, qty jam (otomatis hitung waktu selesai), catatan
- Validasi jadwal agar tidak dobel di ruangan sama
- Daftar sesi aktif dengan opsi edit/hapus
- Ubah ruangan dan qty jam secara langsung, termasuk perpindahan ruangan

### 7. Build & Deploy

```bash
npm run build
npm start
```

Deploy ke platform favorit (misal Vercel). Pastikan variabel lingkungan diset di platform deployment.
