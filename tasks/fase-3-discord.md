# Fase 3 — Integrasi Discord

**Goal:** Transaksi, pengambilan, validasi, dan cek status tiket dari Discord berjalan penuh.
Notifikasi keluar dengan mention dan tombol interaktif.
Prasyarat: Fase 2 selesai dan CHECKPOINT 2 lulus.

---

## T14: Endpoint Interactions Discord dan Verifikasi Ed25519

**Description:**
Buat endpoint `POST /api/discord/interactions` yang menerima semua slash command, klik tombol,
dan submit modal dari Discord. Setiap request diverifikasi dengan signature Ed25519 sebelum
diproses. Request tanpa signature valid ditolak 401. Respons PING dibalas langsung.

**Acceptance criteria:**
- [ ] Endpoint `POST /api/discord/interactions` terdaftar sebagai Interactions Endpoint URL di Discord Developer Portal
- [ ] Verifikasi Ed25519 menggunakan header `X-Signature-Ed25519` dan `X-Signature-Timestamp` pada setiap request
- [ ] Request dengan signature tidak valid → respons 401
- [ ] Discord PING → respons `{ type: 1 }` (PONG) dalam < 1 detik
- [ ] Skrip pendaftaran slash command (`scripts/register-commands.ts`) berjalan satu kali dan mendaftarkan semua command ke Discord API
- [ ] `discord_interaction_log` mencatat setiap interaksi (interaction_id unik, command, user_id, status)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: Discord Developer Portal → klik "Test Interactions Endpoint" → berhasil
- [ ] Manual: jalankan skrip register command → semua command muncul di Discord

**Dependencies:** T02, T04

**Files likely touched:**
- `src/app/api/discord/interactions/route.ts`
- `src/lib/discord-verify.ts` (Ed25519 verification)
- `src/lib/discord-client.ts` (REST API client)
- `scripts/register-commands.ts`

**Estimated scope:** M

---

## T15: Slash Command Baca (status, mine, available, list)

**Description:**
Implementasi slash command yang hanya membaca data: `/ticket status`, `/ticket mine`,
`/ticket available`, `/ticket list`. Semua respons bersifat ephemeral by default.
User yang belum login di web menerima ephemeral berisi tautan login. User Inactive
menerima pesan "akun belum diaktifkan".

**Acceptance criteria:**
- [ ] `/ticket status <nomor>` → embed: judul, project, status, prioritas, role tujuan, assignee, validator, waktu dibuat/diubah, tautan web
- [ ] `/ticket mine` → daftar tiket aktif milik/ditugaskan ke pemanggil (maks. 10 dengan tautan)
- [ ] `/ticket available` → daftar tiket `Open` yang ditujukan ke role pemanggil atau `Semua` (maks. 10)
- [ ] `/ticket list [project] [status]` → daftar ringkas tiket sesuai filter (maks. 10)
- [ ] User belum login → ephemeral dengan tautan login ke web
- [ ] User Inactive → ephemeral "akun belum diaktifkan"
- [ ] Semua respons data → ephemeral by default
- [ ] Role dan hak pemanggil dicek dari database (bukan dari session Discord)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: `/ticket status WMS-0001` di Discord → embed tampil dengan data yang benar
- [ ] Manual: `/ticket mine` sebagai user Inactive → pesan ephemeral penolakan
- [ ] Manual: `/ticket available` sebagai developer BE → hanya tiket target BE dan Semua

**Dependencies:** T08, T14

**Files likely touched:**
- `src/app/api/discord/interactions/route.ts` (tambah handler)
- `src/lib/discord-handlers/ticket-status.ts`
- `src/lib/discord-handlers/ticket-mine.ts`
- `src/lib/discord-handlers/ticket-available.ts`
- `src/lib/discord-handlers/ticket-list.ts`
- `src/lib/discord-guard.ts` (cek user login/inactive)

**Estimated scope:** M

---

## T16: Slash Command Tulis (create, take, resolve, validate, reopen, comment)

**Description:**
Implementasi slash command yang mengubah state: `/ticket create` (dengan modal), `/ticket take`,
`/ticket resolve` (dengan modal catatan), `/ticket validate`, `/ticket reopen` (dengan modal
alasan), `/ticket comment`. Semua aturan akses dan validasi sama persis dengan web (server-side).

**Acceptance criteria:**
- [ ] `/ticket create` → opsi project/tipe/prioritas/role tujuan, lalu modal judul+deskripsi; tiket dibuat, `source = discord`
- [ ] `/ticket take <nomor>` → pengambilan atomik; yang kalah mendapat ephemeral "sudah diambil oleh X" (FR-T3)
- [ ] `/ticket resolve <nomor>` → modal catatan penyelesaian wajib; status → `Resolved`
- [ ] `/ticket validate <nomor>` → validasi → `Closed`; QA yang menyelesaikan sendiri ditolak
- [ ] `/ticket reopen <nomor>` → modal alasan wajib; status → `In Progress`
- [ ] `/ticket comment <nomor>` → modal teks komentar; komentar tersimpan dengan `source = discord`
- [ ] Semua hak akses dicek ulang dari database pada setiap command dan klik tombol
- [ ] Respons awal interaksi < 3 detik; gunakan deferred response bila perlu
- [ ] Idempotensi: `discord_interaction_log` mencegah duplikasi jika interaksi dikirim ulang Discord

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: `/ticket create` → tiket terbuat dan muncul di web dengan `source = discord`
- [ ] Manual: `/ticket take` di 2 klien hampir bersamaan → hanya satu berhasil
- [ ] Manual: `/ticket validate` oleh QA yang menyelesaikan sendiri → ditolak dengan ephemeral

**Dependencies:** T10, T11, T15

**Files likely touched:**
- `src/lib/discord-handlers/ticket-create.ts`
- `src/lib/discord-handlers/ticket-take.ts`
- `src/lib/discord-handlers/ticket-resolve.ts`
- `src/lib/discord-handlers/ticket-validate.ts`
- `src/lib/discord-handlers/ticket-reopen.ts`
- `src/lib/discord-handlers/ticket-comment.ts`
- `src/lib/ticket-transitions.ts` (reuse logika dari web)

**Estimated scope:** L

---

## T17: Notifikasi Keluar Discord

**Description:**
Implementasi semua notifikasi push ke channel Discord: tiket dibuat, diambil, resolved, reopen,
closed, assign/reassign. Pesan notifikasi disimpan (`discord_channel_id`, `discord_message_id`)
agar dapat diperbarui. Kegagalan notifikasi tidak menggagalkan transaksi tiket.

**Acceptance criteria:**
- [ ] **Tiket dibuat:** pesan ke channel project mention semua user aktif ber-role tujuan (atau semua user aktif jika `Semua`), dengan tombol "Ambil Tiket" (FR-X6)
- [ ] **Tiket diambil:** pesan notifikasi awal diperbarui — tombol dinonaktifkan, assignee ditampilkan (FR-X7)
- [ ] **Tiket Resolved:** pesan ke channel project mention semua user ber-role QA, dengan tombol "Validasi" dan "Reopen" (FR-X8)
- [ ] **Reopen:** pesan mention assignee beserta alasan (FR-X9)
- [ ] **Tiket Closed:** pemberitahuan ke assignee dan reporter (FR-X10, Should)
- [ ] **Assign/Reassign:** pesan mention assignee baru (FR-X11, Should)
- [ ] Bila daftar mention melebihi 2.000 karakter, pesan dipecah menjadi beberapa pesan
- [ ] `allowed_mentions` diisi eksplisit untuk mencegah mention tidak disengaja
- [ ] Kegagalan notifikasi dicatat (log) dan tidak menggagalkan transaksi tiket (FR-X12)
- [ ] Notifikasi dikirim dari transaksi tiket (web maupun Discord) — satu titik pengiriman

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: buat tiket dari web → pesan muncul di channel Discord dengan tombol "Ambil Tiket"
- [ ] Manual: ambil tiket dari Discord → pesan notifikasi awal diperbarui (tombol dinonaktifkan)
- [ ] Manual: resolve tiket → pesan ke QA dengan tombol Validasi dan Reopen

**Dependencies:** T14, T16

**Files likely touched:**
- `src/lib/discord-notifications.ts` (fungsi utama notifikasi)
- `src/app/api/tickets/route.ts` (panggil notifikasi setelah buat tiket)
- `src/app/api/tickets/[id]/take/route.ts` (update pesan setelah diambil)
- `src/app/api/tickets/[id]/resolve/route.ts`
- `src/app/api/tickets/[id]/validate/route.ts`
- `src/app/api/tickets/[id]/reopen/route.ts`

**Estimated scope:** L

---

## T18: Guard Discord — User Belum Login, Inactive, dan Idempoten

**Description:**
Middleware Discord untuk semua command dan klik tombol: cek user sudah login ke web dan aktif.
Implementasi idempoten berdasarkan `discord_interaction_log` (interaction_id unik) agar duplikasi
interaksi dari Discord tidak menyebabkan double-action.

**Acceptance criteria:**
- [ ] User Discord yang belum pernah login ke web → ephemeral dengan tautan login
- [ ] User Discord dengan akun `Inactive` → ephemeral "akun belum diaktifkan oleh Admin"
- [ ] `custom_id` tombol diverifikasi aksi dan nomor tiket, tapi hak selalu dicek ulang dari DB (bukan dari custom_id)
- [ ] Interaksi dengan `interaction_id` yang sudah ada di log → diabaikan / respons idempoten
- [ ] Log interaksi retensi pendek (bisa diatur via cron cleanup atau TTL)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: kirim slash command dari akun Discord yang belum terdaftar → ephemeral dengan link login
- [ ] Manual: kirim slash command dari akun Inactive → ephemeral penolakan
- [ ] Manual: simulasi duplikasi interaction_id → tidak ada double-action

**Dependencies:** T14, T15, T16

**Files likely touched:**
- `src/lib/discord-guard.ts` (expand dari T15)
- `src/lib/discord-idempotency.ts`
- `src/app/api/discord/interactions/route.ts`

**Estimated scope:** S

---

## CHECKPOINT 3 — Setelah T14–T18

- [ ] `npm run build` berhasil tanpa error
- [ ] `npx tsc --noEmit` bersih
- [ ] Verifikasi Ed25519 berjalan; request tanpa signature valid → 401
- [ ] Semua slash command terdaftar di Discord
- [ ] Siklus tiket lengkap dapat dilakukan dari Discord (buat, ambil, selesaikan, validasi, reopen)
- [ ] Notifikasi keluar muncul di channel Discord dengan tombol interaktif
- [ ] Pesan notifikasi lama diperbarui saat tiket diambil
- [ ] User belum login dan Inactive mendapat respons ephemeral yang tepat
- [ ] Kegagalan notifikasi tidak menggagalkan transaksi tiket
- [ ] **Review dengan human sebelum lanjut ke Fase 4**
