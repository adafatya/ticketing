# Fase 5 — Penyempurnaan dan Rilis MVP

**Goal:** Fitur-fitur Should/Could yang tersisa, hardening keamanan, UAT, dan perbaikan bug
menuju rilis MVP.
Prasyarat: Fase 3 dan Fase 4 selesai, CHECKPOINT 3 dan 4 lulus.

---

## T23: Slash Command Tambahan dari Discord (resolve, validate, reopen, comment via Fase 3)

**Description:**
Verifikasi bahwa `/ticket resolve`, `/ticket validate`, `/ticket reopen`, dan `/ticket comment`
dari Discord berjalan end-to-end dengan notifikasi yang benar setelah Fase 3 dan 4 terintegrasi.
Ini adalah task integrasi/smoke-test, bukan implementasi baru.

**Acceptance criteria:**
- [ ] `/ticket resolve` dari Discord memicu notifikasi ke QA dengan tombol Validasi dan Reopen
- [ ] `/ticket validate` dari Discord memperbarui pesan notifikasi (tombol dinonaktifkan)
- [ ] `/ticket reopen` dari Discord memicu notifikasi ke assignee
- [ ] `/ticket comment` dari Discord tercatat di audit trail web
- [ ] Semua command di atas tercermin di dashboard setelah cache expire

**Verification:**
- [ ] Manual: jalankan siklus tiket lengkap dari Discord, cek konsistensi di web dan dashboard

**Dependencies:** T16, T17, T22

**Files likely touched:** Tidak ada file baru; hanya verifikasi integrasi

**Estimated scope:** XS

---

## T24: DM Opsional ke Assignee (FR-X13, Could)

**Description:**
Kirim DM Discord ke assignee sebagai tambahan opsional saat tiket diambil, di-assign, atau
di-reopen. DM bersifat best-effort: kegagalan (user menonaktifkan DM) dicatat, tidak di-retry.

**Acceptance criteria:**
- [ ] DM terkirim ke assignee saat: tiket diambil sendiri, di-assign oleh PM/Admin, atau di-reopen
- [ ] Kegagalan DM (403 dari Discord API) dicatat di log dan tidak menggagalkan transaksi
- [ ] Fitur DM dapat dinonaktifkan via `app_settings` (toggle global)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: assign tiket ke user yang mengizinkan DM → DM terkirim
- [ ] Manual: assign tiket ke user yang menonaktifkan DM → transaksi tetap berhasil, error dicatat

**Dependencies:** T17

**Files likely touched:**
- `src/lib/discord-notifications.ts` (tambah fungsi sendDM)
- `src/app/api/tickets/[id]/assign/route.ts`
- `src/app/api/tickets/[id]/take/route.ts`

**Estimated scope:** S

---

## T25: Ekspor CSV Tiket (FR-T16, Could)

**Description:**
Tombol ekspor di halaman daftar tiket yang menghasilkan file CSV berdasarkan filter aktif.
Ekspor berjalan server-side (streaming response) tanpa menyimpan file di filesystem.

**Acceptance criteria:**
- [ ] Tombol "Ekspor CSV" muncul di halaman daftar tiket
- [ ] CSV berisi semua kolom utama tiket sesuai filter aktif saat klik ekspor
- [ ] Ekspor berjalan sebagai streaming HTTP response (tidak menyimpan file di server)
- [ ] Nama file menyertakan timestamp dan filter aktif (mis. `tickets-open-2026-10-21.csv`)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: filter tiket per project → klik ekspor → file CSV terunduh dengan data yang sesuai

**Dependencies:** T08

**Files likely touched:**
- `src/app/api/tickets/export/route.ts`
- `src/components/ticket-table.tsx` (tambah tombol ekspor)

**Estimated scope:** S

---

## T26: Overdue Marker, Notifikasi Closed, dan Penanda Waktu Dashboard

**Description:**
Implementasi penanda overdue yang dihitung saat query (bukan scheduler), notifikasi Closed ke
assignee dan reporter (FR-X10), dan penanda waktu data terakhir diperbarui di dashboard (FR-D10).

**Acceptance criteria:**
- [ ] Penanda overdue dihitung dari `due_at < NOW() AND status NOT IN ('Resolved', 'Closed', 'Cancelled')` — langsung di query, tanpa scheduler (sesuai PRD Q9)
- [ ] Saat tiket ditutup (Closed), notifikasi dikirim ke assignee dan reporter di Discord (FR-X10)
- [ ] Dashboard menampilkan timestamp "Data terakhir diperbarui: X menit lalu" (FR-D10)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: set `due_at` ke waktu lampau, buka daftar tiket → penanda overdue muncul
- [ ] Manual: validate tiket (Closed) → notifikasi ke assignee dan reporter dikirim

**Dependencies:** T17, T22

**Files likely touched:**
- `src/lib/dashboard/queries.ts` (overdue logic)
- `src/lib/discord-notifications.ts` (tambah closed notification)
- `src/components/dashboard/summary-cards.tsx` (timestamp)

**Estimated scope:** S

---

## T27: Hardening Keamanan

**Description:**
Audit dan penguatan keamanan menyeluruh sebelum rilis: CSRF protection, validasi input skema
di semua endpoint, rate limit Discord, query berparameter (tidak ada string interpolation),
dan review secret management.

**Acceptance criteria:**
- [ ] Semua route handler API memvalidasi input dengan skema (mis. Zod) sebelum memproses
- [ ] Tidak ada string interpolation SQL — semua query menggunakan Drizzle query builder atau `sql` tagged template dengan parameter
- [ ] CSRF token/header validation aktif untuk semua mutasi dari web
- [ ] Discord rate limit: header `Retry-After` dibaca dan dihormati saat mengirim notifikasi
- [ ] Semua secret (token, key) hanya dari environment variable; tidak ada hardcode
- [ ] `ADMIN_DISCORD_IDS` divalidasi format saat startup
- [ ] Review `Content-Security-Policy` header dasar

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: kirim request POST API dengan body tidak valid → 400 dengan pesan error yang tepat
- [ ] Manual: kirim request tanpa CSRF token (dari luar web) → ditolak

**Dependencies:** T01–T26 (review menyeluruh)

**Files likely touched:**
- `src/middleware.ts`
- `src/lib/validate.ts` (Zod schemas terpusat)
- Semua `route.ts` yang belum ada validasi Zod
- `next.config.ts` (security headers)

**Estimated scope:** L

---

## T28: UAT dan Perbaikan Bug

**Description:**
User Acceptance Testing dengan tim IT internal. Jalankan skenario end-to-end dari semua persona
(Admin, PM, QA, BE/FE/AI/DevOps). Catat dan perbaiki bug yang ditemukan. Tetapkan ambang N hari
untuk daftar perhatian dashboard. Konfirmasi metrik keberhasilan dari PRD Section 10.

**Acceptance criteria:**
- [ ] Skenario UAT lengkap dijalankan untuk setiap role
- [ ] Tidak ada bug severity High atau Critical yang terbuka saat rilis
- [ ] Ambang N hari untuk daftar perhatian ditetapkan dan dikonfigurasi di `app_settings`
- [ ] Semua pertanyaan terbuka dari PRD (Q1–Q10) sudah terjawab dan didokumentasikan
- [ ] Dokumentasi singkat cara deploy, cara register Discord command, dan cara set env var tersedia

**Verification:**
- [ ] Manual: jalankan checklist UAT per persona
- [ ] Manual: verifikasi metrik keberhasilan PRD Section 10 dapat diamati dari dashboard

**Dependencies:** T23–T27

**Files likely touched:**
- `docs/deployment.md`
- `docs/discord-setup.md`
- Bug fixes (tersebar, ditentukan saat UAT)

**Estimated scope:** L

---

## CHECKPOINT FINAL — Setelah T23–T28

- [ ] `npm run build` berhasil tanpa error
- [ ] `npx tsc --noEmit` bersih
- [ ] Semua acceptance criteria dari T01–T28 terpenuhi
- [ ] Semua bug severity High/Critical dari UAT sudah diperbaiki
- [ ] Semua pertanyaan terbuka PRD sudah terjawab
- [ ] Dokumentasi deploy dan Discord setup tersedia
- [ ] Metrik keberhasilan (PRD Section 10) dapat diamati dari dashboard
- [ ] **Rilis MVP — sign-off dari human**
