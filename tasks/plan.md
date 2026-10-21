# Implementation Plan: Aplikasi Ticketing Internal IT

## Overview

Aplikasi web ticketing untuk tim IT internal (Admin, PM, QA, BE, FE, AI, DevOps) yang mencakup
siklus hidup tiket lengkap, manajemen role user, dashboard manajemen, dan integrasi Discord
(login OAuth2, slash command, notifikasi dengan tombol interaktif). Dibangun di atas Next.js
App Router + TypeScript, PostgreSQL (Neon), Drizzle ORM, dan Auth.js. Seluruh infrastruktur
berjalan di Vercel Free (Hobby) plan tanpa bot Discord Gateway.

## Architecture Decisions

- **Vertical slicing per milestone:** setiap milestone menghasilkan fitur yang bisa dijalankan
  end-to-end, bukan layer horizontal (semua DB dulu, lalu semua API, dst).
- **Database-first dalam tiap slice:** skema + migrasi dikerjakan sebelum route handler atau UI,
  agar type-safety Drizzle mengalir ke atas.
- **Discord tanpa Gateway:** seluruh interaksi Discord melalui satu endpoint HTTP
  `POST /api/discord/interactions` (Interactions webhook), REST API untuk notifikasi keluar.
  Tidak ada proses long-running.
- **Role dibaca dari database per request:** sesi Auth.js hanya menyimpan identitas Discord;
  role selalu di-query ulang, sehingga perubahan role langsung berlaku.
- **Notifikasi atomik:** pengambilan tiket pakai `UPDATE ... WHERE assignee_id IS NULL AND
  status = 'Open'`; notifikasi dikirim sebagai satu pesan channel dengan mention, bukan DM massal.
- **Cache dashboard:** agregasi SQL di server, di-cache 60–300 detik; tidak ada client polling.

## Keputusan Terbuka (dari PRD Q1–Q10)

| Q1 (Vercel Hobby komersial?): dikonfirmasi — aplikasi internal, Hobby plan aman. Tidak perlu upgrade.
Q3 (cara angkat Admin): dikonfirmasi — bisa dari env var `ADMIN_DISCORD_IDS` DAN diangkat lewat menu oleh Admin lain. Sesuai asumsi default PRD.
Q7 (validasi QA untuk semua tipe?): dikonfirmasi — tiket bertipe "Pertanyaan" boleh langsung Closed oleh assignee tanpa validasi QA. Tercermin di T11.

## Task List (Index per Fase)

### Fase 1 — Fondasi (tasks/fase-1-fondasi.md)
- [ ] T01: Setup repo, tooling, CI dasar
- [ ] T02: Skema database & migrasi awal
- [ ] T03: Login Discord OAuth2 (Auth.js)
- [ ] T04: Middleware role + halaman "Menunggu Aktivasi"
- [ ] T05: Manajemen User & Role (Admin UI)
- [ ] T06: Master Data Project (CRUD)
- [ ] CHECKPOINT 1

### Fase 2 — Tiket (tasks/fase-2-tiket.md)
- [ ] T07: Pembuatan Tiket (form + nomor otomatis)
- [ ] T08: Daftar Tiket (tabel, filter, pagination server-side)
- [ ] T09: Detail Tiket + Komentar + Audit Trail
- [ ] T10: Alur status: Ambil (atomik) → Resolved
- [ ] T11: Alur status: Validasi QA & Reopen
- [ ] T12: Assign/Reassign & Batalkan (PM/Admin)
- [ ] T13: Tampilan "Tiket Tersedia", "Tiket Saya", "Menunggu Validasi"
- [ ] CHECKPOINT 2

### Fase 3 — Discord (tasks/fase-3-discord.md)
- [ ] T14: Endpoint Interactions + verifikasi Ed25519
- [ ] T15: Slash command baca (/ticket status, mine, available, list)
- [ ] T16: Slash command tulis (/ticket create, take, resolve, validate, reopen, comment)
- [ ] T17: Notifikasi keluar (tiket dibuat, diambil, resolved, reopen, closed, assign)
- [ ] T18: Guard: user belum login / Inactive + idempoten interaction log
- [ ] CHECKPOINT 3

### Fase 4 — Dashboard (tasks/fase-4-dashboard.md)
- [ ] T19: Query agregasi SQL + caching ISR/revalidate
- [ ] T20: Kartu ringkasan & tren (FR-D1, FR-D2)
- [ ] T21: Distribusi, beban kerja, kecepatan, kualitas (FR-D3–D6)
- [ ] T22: Aging backlog, daftar perhatian, drill-down (FR-D7–D9)
- [ ] CHECKPOINT 4

### Fase 5 — Penyempurnaan & Rilis (tasks/fase-5-penyempurnaan.md)
- [ ] T23: Slash command tambahan: /ticket resolve, validate, reopen, comment (dari Discord)
- [ ] T24: DM opsional ke assignee (FR-X13)
- [ ] T25: Ekspor CSV tiket (FR-T16)
- [ ] T26: Overdue marker, notifikasi Closed, penanda waktu data dashboard (FR-T14, FR-X10, FR-D10)
- [ ] T27: Hardening: rate limit Discord, CSRF, validasi input skema, query berparameter
- [ ] T28: UAT & perbaikan bug
- [ ] CHECKPOINT FINAL

## Risks and Mitigations

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Vercel Hobby dianggap komersial (Q1) | High | Konfirmasi sebelum M1; arsitektur siap upgrade ke Pro tanpa perubahan |
| Discord cold start → timeout 3 detik | High | Deferred response, query ringan, index DB, koneksi serverless-friendly |
| Race condition pengambilan tiket | High | `UPDATE ... WHERE assignee_id IS NULL AND status = 'Open'` atomik |
| Mention massal melebihi 2.000 karakter | Med | Pecah pesan; `allowed_mentions` eksplisit |
| QA bottleneck validasi | Med | Notifikasi ke seluruh QA; metrik waktu validasi di dashboard |
| Storage/compute Neon free tier habis | Med | Retensi log pendek; monitoring; rencana upgrade |
| Discord outage / perubahan API | Low | Web tetap fungsional penuh tanpa Discord kecuali login |

## Open Questions untuk Human

- [x] Q1: Hobby plan aman — aplikasi internal, bukan komersial
- [x] Q3: Admin bisa dari env var DAN diangkat lewat menu oleh Admin lain
- [x] Q7: Tiket "Pertanyaan" boleh langsung Closed tanpa validasi QA
- [ ] Ambang N hari untuk "daftar perhatian" dashboard (FR-D8) — ditetapkan saat UAT
