# Fase 2 — Tiket

**Goal:** Siklus tiket lengkap berjalan di web: buat, ambil, selesaikan, validasi QA, reopen,
batalkan, komentar, audit trail, filter/daftar.
Prasyarat: Fase 1 selesai dan CHECKPOINT 1 lulus.

---

## T07: Pembuatan Tiket

**Description:**
Form pembuatan tiket yang dapat diakses semua user aktif. Nomor tiket dibuat otomatis per project
dalam transaksi database (hindari race condition). Setelah tiket dibuat, notifikasi dikirim ke
semua user aktif ber-role tujuan (placeholder Discord — implementasi penuh di Fase 3).

**Acceptance criteria:**
- [ ] Semua user aktif dapat membuat tiket (FR-T1)
- [ ] Form wajib: project, judul, deskripsi, tipe (Bug/Request/Task/Pertanyaan), prioritas (Low/Medium/High/Critical), role tujuan (FR-T1)
- [ ] Nomor tiket dibuat otomatis dengan format `{KODE}-{seq_no:04d}` dalam transaksi DB (FR-P3)
- [ ] Tiket baru berstatus `Open` tanpa assignee (FR-T2)
- [ ] Field `source` diisi `web`
- [ ] Event `created` tercatat di `ticket_events`

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: buat tiket baru → muncul di daftar dengan nomor urut yang benar
- [ ] Manual: buat 2 tiket sekaligus di project yang sama → nomor tidak duplikat

**Dependencies:** T02, T04, T06

**Files likely touched:**
- `src/app/tickets/new/page.tsx`
- `src/app/api/tickets/route.ts` (POST)
- `src/lib/ticket-number.ts` (fungsi generate nomor atomik)
- `src/db/schema.ts`

**Estimated scope:** M

---

## T08: Daftar Tiket

**Description:**
Halaman daftar tiket dengan pencarian full-text (judul/nomor), filter multi-parameter, sorting,
dan pagination server-side. Semua user aktif dapat melihat semua tiket.

**Acceptance criteria:**
- [ ] Tabel menampilkan: nomor, judul, project, status, prioritas, tipe, assignee, role tujuan, reporter, tanggal dibuat (FR-T12)
- [ ] Filter: project, status, prioritas, assignee, reporter, role tujuan, tipe, rentang tanggal (FR-T12)
- [ ] Pencarian berdasarkan judul atau nomor tiket (FR-T12)
- [ ] Sort pada kolom utama
- [ ] Pagination server-side (bukan client-side)
- [ ] URL menyimpan state filter (query params) agar bisa di-share
- [ ] Penanda overdue (melewati `due_at` dan belum `Resolved`) ditampilkan di daftar (FR-T14)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: filter per project + status → hasil sesuai
- [ ] Manual: pagination dengan 20+ tiket → page 2 tampil benar

**Dependencies:** T07

**Files likely touched:**
- `src/app/tickets/page.tsx`
- `src/app/api/tickets/route.ts` (GET dengan query params)
- `src/lib/ticket-filters.ts`
- `src/components/ticket-table.tsx`

**Estimated scope:** M

---

## T09: Detail Tiket, Komentar, dan Audit Trail

**Description:**
Halaman detail tiket yang menampilkan semua atribut, riwayat komentar (urut waktu), dan audit
trail lengkap (semua perubahan status, assignee, role tujuan, prioritas, tenggat).

**Acceptance criteria:**
- [ ] Halaman menampilkan semua atribut tiket dari PRD Section 6.2
- [ ] Form komentar tersedia untuk semua user aktif; komentar muncul urut waktu (FR-T6)
- [ ] Audit trail menampilkan: event type, actor, from/to value, note, waktu — untuk setiap perubahan (FR-T11)
- [ ] Penanda overdue ditampilkan jika berlaku (FR-T14)
- [ ] Tombol aksi muncul sesuai role dan status tiket (ambil, selesaikan, validasi, reopen, batalkan)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: buka detail tiket → semua field tampil benar
- [ ] Manual: tambah komentar → muncul di bawah tanpa reload halaman
- [ ] Manual: audit trail menampilkan semua perubahan yang sudah dilakukan

**Dependencies:** T07, T08

**Files likely touched:**
- `src/app/tickets/[id]/page.tsx`
- `src/app/api/tickets/[id]/route.ts` (GET)
- `src/app/api/tickets/[id]/comments/route.ts` (POST, GET)
- `src/components/ticket-detail.tsx`
- `src/components/audit-trail.tsx`

**Estimated scope:** M

---

## T10: Alur Status — Ambil (Atomik) dan Resolved

**Description:**
Implementasi transisi status `Open → In Progress` (pengambilan atomik) dan
`In Progress → Resolved` (dengan catatan penyelesaian wajib). Pengambilan menggunakan
`UPDATE ... WHERE assignee_id IS NULL AND status = 'Open'` untuk mencegah race condition.

**Acceptance criteria:**
- [ ] User ber-role tujuan (atau siapa saja jika `Semua`) dapat mengambil tiket dari halaman detail atau daftar "Tiket Tersedia" (FR-T3)
- [ ] Pengambilan atomik: jika dua user klik bersamaan, hanya satu yang berhasil; yang lain mendapat pesan "sudah diambil oleh X" (FR-T3)
- [ ] `started_at` tercatat saat diambil (FR-T3)
- [ ] Assignee dapat menandai `Resolved` dengan catatan penyelesaian wajib (FR-T7)
- [ ] `resolved_at` tercatat saat resolved (FR-T7)
- [ ] Event `taken` dan `resolved` tercatat di `ticket_events` (FR-T11)
- [ ] Aturan akses divalidasi server-side (bukan hanya UI)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: ambil tiket sebagai user ber-role tujuan → status berubah ke `In Progress`
- [ ] Manual: resolve tiket tanpa catatan → ditolak; dengan catatan → berhasil
- [ ] Manual: simulasi pengambilan bersamaan (buka 2 tab, klik hampir bersamaan) → hanya satu berhasil

**Dependencies:** T09

**Files likely touched:**
- `src/app/api/tickets/[id]/take/route.ts` (POST)
- `src/app/api/tickets/[id]/resolve/route.ts` (POST)
- `src/lib/ticket-transitions.ts`

**Estimated scope:** M

---

## T11: Alur Status — Validasi QA dan Reopen

**Description:**
Implementasi transisi `Resolved → Closed` (validasi QA) dan `Resolved → In Progress` (reopen).
QA tidak dapat memvalidasi tiket yang ia selesaikan sendiri — digantikan PM/Admin.
**Pengecualian (dikonfirmasi):** tiket bertipe "Pertanyaan" boleh langsung `Closed` oleh assignee
tanpa melewati validasi QA — assignee menandai Resolved sekaligus Closed, `validator_id` diisi
dengan `assignee_id`.

**Acceptance criteria:**
- [ ] QA (bukan yang menyelesaikan), PM, atau Admin dapat memvalidasi tiket non-Pertanyaan → status `Closed`; `validator_id` dan `closed_at` tercatat (FR-T9)
- [ ] Tiket bertipe "Pertanyaan": assignee dapat langsung menutup (`Closed`) tanpa validasi QA; `validator_id = assignee_id`
- [ ] QA tidak dapat memvalidasi tiket non-Pertanyaan yang ia selesaikan sendiri (validasi server-side) (FR-T9)
- [ ] QA, PM, atau Admin dapat reopen tiket dengan alasan wajib → status kembali `In Progress`; `reopen_count` bertambah (FR-T10)
- [ ] Event `validated` dan `reopened` tercatat di `ticket_events` (FR-T11)
- [ ] Assignee tetap sama setelah reopen (FR-T10)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: QA validate tiket yang bukan ia selesaikan → Closed
- [ ] QA tidak dapat memvalidasi tiket non-Pertanyaan yang ia selesaikan sendiri → ditolak; tiket bertipe "Pertanyaan" → assignee langsung Closed tanpa QA
- [ ] Manual: reopen tanpa alasan → ditolak; dengan alasan → berhasil, `reopen_count` naik

**Dependencies:** T10

**Files likely touched:**
- `src/app/api/tickets/[id]/validate/route.ts` (POST)
- `src/app/api/tickets/[id]/reopen/route.ts` (POST)
- `src/lib/ticket-transitions.ts`

**Estimated scope:** S

---

## T12: Assign/Reassign dan Batalkan (PM/Admin)

**Description:**
PM dan Admin dapat assign/reassign tiket ke user mana pun dan membatalkan tiket dengan alasan.
Bila user di-Inactive-kan, tiket `In Progress` miliknya kembali ke `Open`.

**Acceptance criteria:**
- [ ] PM/Admin dapat assign/reassign tiket ke user mana pun; role tujuan dapat diubah (FR-T5)
- [ ] PM/Admin dapat membatalkan tiket (`Cancelled`) dengan alasan wajib (FR-T15)
- [ ] Bila assignee di-Inactive-kan, tiket `In Progress` miliknya kembali ke `Open` tanpa assignee; role tujuan tetap (FR-U7, baris status tabel PRD)
- [ ] Event `assigned`, `cancelled`, `released` tercatat di `ticket_events`

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: PM assign tiket ke user lain → `assignee_id` berubah, event tercatat
- [ ] Manual: batalkan tiket tanpa alasan → ditolak; dengan alasan → status `Cancelled`
- [ ] Manual: nonaktifkan user yang punya tiket `In Progress` → tiket kembali `Open`

**Dependencies:** T11

**Files likely touched:**
- `src/app/api/tickets/[id]/assign/route.ts` (POST)
- `src/app/api/tickets/[id]/cancel/route.ts` (POST)
- `src/app/api/admin/users/[id]/route.ts` (PATCH — sudah ada, tambah logika release tiket)
- `src/lib/ticket-transitions.ts`

**Estimated scope:** S

---

## T13: Tampilan "Tiket Tersedia", "Tiket Saya", dan "Menunggu Validasi"

**Description:**
Tiga tampilan filtered khusus sesuai konteks user yang login. Semua berbasis query server-side.

**Acceptance criteria:**
- [ ] "Tiket Tersedia": tiket `Open` tanpa assignee yang ditujukan ke role saya atau `Semua` (FR-T4)
- [ ] "Tiket Saya": tiket yang ditugaskan ke saya atau dibuat oleh saya (FR-T13)
- [ ] "Menunggu Validasi": tiket berstatus `Resolved` — khusus terlihat di navigasi untuk QA, PM, Admin (FR-T13)
- [ ] Semua tampilan support pagination dan menampilkan penanda overdue (FR-T14)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: login sebagai developer BE → "Tiket Tersedia" hanya tampilkan tiket target BE dan Semua
- [ ] Manual: login sebagai QA → "Menunggu Validasi" tampilkan semua tiket Resolved

**Dependencies:** T08, T10

**Files likely touched:**
- `src/app/tickets/available/page.tsx`
- `src/app/tickets/mine/page.tsx`
- `src/app/tickets/pending-validation/page.tsx`
- `src/app/api/tickets/route.ts` (tambah filter preset)

**Estimated scope:** S

---

## CHECKPOINT 2 — Setelah T07–T13

- [ ] `npm run build` berhasil tanpa error
- [ ] `npx tsc --noEmit` bersih
- [ ] Siklus tiket lengkap end-to-end di web: Buat → Ambil → Resolved → Validated/Reopen
- [ ] Audit trail merekam semua perubahan
- [ ] Filter dan pagination daftar tiket berfungsi
- [ ] Tampilan "Tiket Tersedia", "Tiket Saya", "Menunggu Validasi" berfungsi
- [ ] Race condition pengambilan tiket tertangani (test manual 2 tab)
- [ ] **Review dengan human sebelum lanjut ke Fase 3**
