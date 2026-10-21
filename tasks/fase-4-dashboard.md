# Fase 4 — Dashboard Manajemen

**Goal:** Dashboard analitik untuk PM dan Admin — kartu ringkasan, tren, distribusi, beban kerja,
kecepatan, kualitas, aging backlog, daftar perhatian, drill-down, dan caching.
Prasyarat: Fase 2 selesai dan CHECKPOINT 2 lulus (Fase 3 bisa paralel).

---

## T19: Query Agregasi SQL dan Caching

**Description:**
Buat semua query SQL agregasi untuk metrik dashboard menggunakan Drizzle ORM.
Implementasi caching via Next.js `revalidate` (ISR) atau `unstable_cache` untuk menekan
invokasi dan beban database. Tidak ada client polling — refresh manual.

**Acceptance criteria:**
- [ ] Fungsi query untuk setiap kelompok metrik (ringkasan, tren, distribusi, beban kerja, kecepatan, kualitas, aging) tersedia sebagai server functions yang dapat di-compose
- [ ] Query menerima filter: rentang tanggal (default 30 hari) dan project (satu atau banyak)
- [ ] Cache diterapkan: data di-refresh paling cepat setiap 60–300 detik (dapat dikonfigurasi via `app_settings`)
- [ ] Query dashboard selesai < 3 detik pada dataset ≤ 5.000 tiket dengan indeks yang sudah ada
- [ ] Tidak ada client-side polling (refresh hanya manual atau saat user buka halaman)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: ukur waktu respons query di Neon console atau Vercel logs → < 3 detik
- [ ] Manual: verifikasi cache bekerja (hit kedua lebih cepat dari hit pertama)

**Dependencies:** T07, T10, T11

**Files likely touched:**
- `src/lib/dashboard/queries.ts`
- `src/lib/dashboard/cache.ts`
- `src/db/schema.ts` (pastikan indeks sudah ada)

**Estimated scope:** M

---

## T20: Kartu Ringkasan dan Tren (FR-D1, FR-D2)

**Description:**
Bagian pertama dashboard: kartu ringkasan status tiket dan grafik tren tiket dibuat vs ditutup
per hari/minggu. Filter global (rentang tanggal, project) diterapkan ke semua komponen.

**Acceptance criteria:**
- [ ] Kartu ringkasan: Total tiket, Open (belum diambil), In Progress, Resolved (menunggu QA), Closed, Overdue, Critical aktif (FR-D1)
- [ ] Grafik tren: tiket dibuat vs ditutup per hari dan per minggu (dapat di-toggle) (FR-D2)
- [ ] Filter global (rentang tanggal + project) diterapkan ke kartu dan grafik
- [ ] Filter tersimpan di URL (query params) agar bisa di-share
- [ ] Penanda waktu data terakhir diperbarui ditampilkan (FR-D10, Should)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: ubah filter rentang tanggal → kartu dan grafik berubah sesuai
- [ ] Manual: angka kartu "Open" cocok dengan jumlah tiket Open di daftar tiket

**Dependencies:** T19

**Files likely touched:**
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/summary-cards.tsx`
- `src/components/dashboard/trend-chart.tsx`
- `src/components/dashboard/global-filter.tsx`

**Estimated scope:** M

---

## T21: Distribusi, Beban Kerja, Kecepatan, dan Kualitas (FR-D3–D6)

**Description:**
Empat kelompok metrik lanjutan: distribusi tiket per dimensi, beban kerja per assignee/role,
metrik kecepatan (waktu ambil, waktu kerjakan, waktu validasi), dan metrik kualitas (reopen).

**Acceptance criteria:**
- [ ] Distribusi: tiket per project, per prioritas, per tipe, per status, per role tujuan — ditampilkan sebagai grafik/tabel (FR-D3)
- [ ] Beban kerja: jumlah tiket aktif per assignee dan per role; tiket Open belum diambil per role tujuan (FR-D4)
- [ ] Kecepatan: median dan rata-rata waktu ambil (Open→In Progress), waktu kerjakan (In Progress→Resolved), waktu validasi QA (Resolved→Closed) (FR-D5)
- [ ] Kualitas: jumlah dan persentase tiket yang di-reopen, per project dan per role (FR-D6)
- [ ] Semua komponen mengikuti filter global (rentang tanggal + project)

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: buat tiket, ambil, resolve, validate → metrik kecepatan terupdate setelah cache expire
- [ ] Manual: reopen tiket → persentase reopen di metrik kualitas bertambah

**Dependencies:** T20

**Files likely touched:**
- `src/components/dashboard/distribution-chart.tsx`
- `src/components/dashboard/workload-table.tsx`
- `src/components/dashboard/velocity-metrics.tsx`
- `src/components/dashboard/quality-metrics.tsx`
- `src/lib/dashboard/queries.ts` (tambah query jika belum ada di T19)

**Estimated scope:** L

---

## T22: Aging Backlog, Daftar Perhatian, dan Drill-Down (FR-D7–D9)

**Description:**
Tiga fitur tambahan dashboard: aging backlog per rentang umur, daftar perhatian (tiket kritis/
high/overdue/stale), dan drill-down dari kartu/grafik ke daftar tiket yang sesuai.

**Acceptance criteria:**
- [ ] Aging backlog: tiket aktif dikelompokkan per rentang umur: 0–3, 4–7, 8–14, >14 hari (FR-D7, Should)
- [ ] Daftar perhatian: tiket Critical/High aktif, overdue, Open belum diambil > N hari, Resolved belum divalidasi > N hari — dengan tautan ke detail (FR-D8, Must); N hari dapat dikonfigurasi dari `app_settings`
- [ ] Drill-down: klik kartu atau grafik membuka halaman daftar tiket dengan filter yang sesuai sudah terisi (FR-D9, Should)
- [ ] Semua komponen mengikuti filter global

**Verification:**
- [ ] Build: `npm run build`
- [ ] Manual: klik kartu "Open" → halaman daftar tiket terbuka dengan filter status=Open
- [ ] Manual: daftar perhatian tampilkan tiket yang sudah melewati N hari ambang batas

**Dependencies:** T21

**Files likely touched:**
- `src/components/dashboard/aging-backlog.tsx`
- `src/components/dashboard/attention-list.tsx`
- `src/app/dashboard/page.tsx` (tambah drill-down link)
- `src/lib/dashboard/queries.ts`

**Estimated scope:** M

---

## CHECKPOINT 4 — Setelah T19–T22

- [ ] `npm run build` berhasil tanpa error
- [ ] `npx tsc --noEmit` bersih
- [ ] Dashboard dapat diakses oleh PM dan Admin, ditolak untuk role lain
- [ ] Semua kartu, grafik, dan tabel menampilkan data yang konsisten dengan daftar tiket
- [ ] Filter global (rentang tanggal + project) berfungsi di semua komponen
- [ ] Caching berjalan (akses kedua lebih cepat, data lama hingga TTL)
- [ ] Drill-down dari kartu ke daftar tiket berfungsi
- [ ] **Review dengan human sebelum lanjut ke Fase 5**
