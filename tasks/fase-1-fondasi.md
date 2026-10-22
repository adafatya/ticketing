# Fase 1 — Fondasi

**Goal:** Login berjalan, role dapat diatur Admin, project dapat dikelola.
Ini adalah prasyarat semua fase berikutnya.

---

## Task 1: Setup repo, tooling, dan CI dasar (T01)

**Description:**
Inisialisasi repo Next.js (App Router, TypeScript), konfigurasi Drizzle ORM, ESLint, Prettier,
Husky pre-commit hook, dan GitHub Actions CI (lint + type-check). Deploy awal ke Vercel
(staging + production). Buat file `.env.example` dengan semua variable yang dibutuhkan.

**Acceptance criteria:**
- [x] `next build` berhasil tanpa error
- [x] `npx tsc --noEmit` bersih
- [x] ESLint dan Prettier terkonfigurasi dan dijalankan di pre-commit
- [x] CI GitHub Actions berjalan pada setiap PR (lint, type-check)
- [x] Vercel preview deploy berjalan dari branch
- [x] `.env.example` mendokumentasikan semua env var wajib

**Verification:**
- [x] Build: `npm run build`
- [x] Type check: `npx tsc --noEmit`
- [x] Manual: buka Vercel preview URL, halaman default tampil

**Dependencies:** None

**Files likely touched:**
- `package.json`, `tsconfig.json`, `.eslintrc.json`, `.prettierrc`
- `.github/workflows/ci.yml`
- `drizzle.config.ts`
- `.env.example`, `.env.local` (tidak di-commit)

**Estimated scope:** M

---

## Task 2: Skema database dan migrasi awal (T02)

**Description:**
Buat skema Drizzle untuk semua entitas inti: `users`, `user_role_events`, `projects`,
`tickets`, `ticket_comments`, `ticket_events`, `app_settings`, `discord_interaction_log`.
Jalankan migrasi ke Neon (staging). Tambahkan semua indeks penting dari PRD Section 7.

**Acceptance criteria:**
- [x] Semua tabel dari PRD Section 7 terdefinisi di skema Drizzle dengan tipe yang tepat
- [x] Enum tipe/status/role menggunakan Drizzle enum (bukan string bebas)
- [x] Semua indeks penting terdefinisi: `tickets(project_id, status)`, `tickets(assignee_id, status)`,
     `tickets(status, target_role)`, `tickets(created_at)`, `tickets(number)` unik,
     `users(discord_id)` unik, `ticket_events(ticket_id, created_at)`
- [x] Migrasi berhasil digenerate dan siap dijalankan (`drizzle/0000_stiff_skreet.sql`)
- [x] `drizzle-kit generate` berjalan tanpa error

**Verification:**
- [x] Build: `npm run build`
- [x] Test: `npm test -- tests/schema.test.ts` pass

**Dependencies:** T01

**Files likely touched:**
- `src/db/schema.ts` (atau per-tabel di `src/db/schema/`)
- `src/db/index.ts`
- `migrations/` (auto-generated)
- `drizzle.config.ts`

**Estimated scope:** M

---

## Task 3: Login Discord OAuth2 (T03)

**Description:**
Konfigurasi Auth.js dengan provider Discord. Scope: `identify`, `email`, `guilds.members.read`.
User baru yang bukan anggota guild ditolak dengan pesan jelas. User baru yang lolos guild-check
dibuat otomatis dengan role `inactive`. Discord ID menjadi identitas penghubung.

**Acceptance criteria:**
- [x] Tombol "Login dengan Discord" membuka alur OAuth2 Discord
- [x] User yang bukan anggota guild dikonfigurasi menerima halaman error "Akses ditolak"
- [x] User baru yang lolos dibuat di tabel `users` dengan `role = inactive`
- [x] User yang sudah terdaftar dengan pra-registrasi Admin (FR-U3) langsung aktif saat login pertama
- [x] Sesi berbasis cookie: `HttpOnly`, `Secure`, `SameSite=lax`
- [x] Discord ID tersimpan di session dan di tabel `users`

**Verification:**
- [x] Build: `npm run build`
- [x] Unit test: `npm test` pass (auth helpers + guild check)

**Dependencies:** T01, T02

**Files likely touched:**
- `src/auth.ts` (Auth.js config)
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/login/page.tsx`
- `src/app/unauthorized/page.tsx`
- `src/lib/discord.ts` (guild membership check)

**Estimated scope:** M

---

## Task 4: Middleware role dan halaman "Menunggu Aktivasi" (T04)

**Description:**
Buat Next.js middleware yang membaca role user dari database (bukan dari session) pada setiap
request ke route yang dilindungi. User dengan role `inactive` diarahkan ke halaman
"Menunggu aktivasi oleh Admin" dan tidak dapat mengakses fitur apapun.

**Acceptance criteria:**
- [x] Middleware berjalan pada semua route kecuali `/login`, `/unauthorized`, `/api/auth/*`, `/api/discord/*`
- [x] User `inactive` diarahkan ke `/waiting-activation` pada semua route dilindungi
- [x] User tidak login diarahkan ke `/login`
- [x] Role dibaca dari database, bukan dari session cookie
- [x] Perubahan role oleh Admin berlaku pada request berikutnya tanpa perlu re-login

**Verification:**
- [x] Build: `npm run build`
- [x] Unit test: `npm test -- tests/route-guard.test.ts` pass

**Dependencies:** T02, T03

**Files likely touched:**
- `src/middleware.ts`
- `src/app/waiting-activation/page.tsx`
- `src/lib/auth-helpers.ts` (helper baca role dari DB)

**Estimated scope:** S

---

## Task 5: Manajemen User & Role (Admin UI) (T05)

**Description:**
Halaman Admin untuk melihat daftar user Discord yang pernah login, mengubah role, dan
mendaftarkan user lebih dulu (pra-registrasi). Termasuk proteksi: sistem menolak menurunkan
atau menonaktifkan Admin terakhir. Perubahan role dicatat di `user_role_events`.

**Acceptance criteria:**
- [x] Daftar user dengan kolom: username, Discord ID, role, login terakhir; ada pencarian dan filter role (FR-U1)
- [x] Admin dapat mengubah role user ke: Admin, PM, QA, BE, FE, AI, DevOps, Inactive (FR-U2)
- [x] Admin dapat mendaftarkan user baru via Discord ID + role sebelum user login (FR-U3)
- [x] User baru tanpa pra-registrasi muncul di daftar "Menunggu role" (FR-U4)
- [x] Setiap perubahan role tercatat di `user_role_events` (siapa, kapan, dari-ke) (FR-U5)
- [x] Sistem menolak menonaktifkan Admin terakhir (FR-U6)
- [x] Admin pertama ditetapkan dari env var `ADMIN_DISCORD_IDS` saat user login pertama kali (FR-U8)
- [x] Hanya user dengan role Admin yang dapat mengakses halaman ini

**Verification:**
- [x] Build: `npm run build`
- [x] Unit test: `npm test -- tests/admin-users.test.ts` pass

**Dependencies:** T02, T03, T04

**Files likely touched:**
- `src/app/admin/users/page.tsx`
- `src/app/admin/users/[id]/page.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/users/preregister/route.ts`

**Estimated scope:** L

---

## Task 6: Master Data Project (CRUD) (T06)

**Description:**
Halaman untuk Admin dan PM membuat, mengubah, dan menonaktifkan project. Kode project unik,
tidak bisa diubah setelah ada tiket. Project nonaktif tidak menerima tiket baru. Setiap project
dapat dikaitkan ke satu channel Discord untuk notifikasi.

**Acceptance criteria:**
- [x] Admin dan PM dapat membuat project dengan: kode unik, nama, deskripsi, PIC/owner, discord_channel_id (opsional) (FR-P1, FR-P2)
- [x] Kode project dipakai sebagai prefix nomor tiket (mis. `WMS-0042`) (FR-P3)
- [x] Semua user aktif dapat melihat semua project aktif (FR-P4)
- [x] Bila `discord_channel_id` kosong, dipakai channel global dari `app_settings` (FR-P5)
- [x] Daftar project dengan pencarian, filter status, pagination (FR-P6)
- [x] Kode project tidak bisa diubah setelah project punya tiket (validasi server-side)
- [x] Project nonaktif tidak bisa menerima tiket baru

**Verification:**
- [x] Build: `npm run build`
- [x] Unit test: `npm test -- tests/projects.test.ts` pass

**Dependencies:** T02, T03, T04

**Files likely touched:**
- `src/app/projects/page.tsx`
- `src/app/projects/new/page.tsx`
- `src/app/projects/[id]/edit/page.tsx`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`

**Estimated scope:** M

---

## CHECKPOINT 1 — Setelah T01–T06

- [x] `npm run build` berhasil tanpa error
- [x] `npx tsc --noEmit` bersih
- [x] Login Discord berjalan end-to-end (login, guild-check, role inactive)
- [x] Admin dapat mengelola user dan role
- [x] Admin/PM dapat mengelola project
- [x] Middleware role berfungsi (inactive → redirect)
- [x] Migrasi DB digenerate (`drizzle/0000_stiff_skreet.sql`) dan siap diaplikasikan
- [ ] **Review dengan human sebelum lanjut ke Fase 2**
