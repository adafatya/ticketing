# PRD — Aplikasi Ticketing

**Versi:** 0.2 (draft) · **Tanggal:** 21 Oktober 2026 · **Status:** Menunggu konfirmasi keputusan terbuka (Bagian 2)

## 1. Ringkasan

Aplikasi web ticketing untuk **tim IT internal** (Admin, PM, QA, BE, FE, AI, DevOps) untuk mencatat, menugaskan, mengerjakan, memvalidasi, dan menyelesaikan permintaan kerja per project. Aplikasi menyediakan master data project, siklus hidup tiket (dibuat → diambil developer → diselesaikan → divalidasi QA), manajemen role user, dashboard untuk manajemen, dan integrasi Discord (login, transaksi tiket, cek status tiket, notifikasi). Aplikasi dirancang agar dapat berjalan di **Vercel Free (Hobby) plan** dengan database eksternal bertier gratis.

## 2. Asumsi & Keputusan Terbuka

Empat keputusan berikut sudah terkunci dan menjadi dasar revisi 0.2.

| ID | Keputusan |
| --- | --- |
| D1 | Aplikasi untuk tim IT internal dengan role Admin, PM, QA, BE, FE, AI, dan DevOps. Semua user aktif dapat membuat tiket. |
| D2 | Admin mengatur role setiap user Discord lewat menu Manajemen User (PM, QA, BE, FE, AI, DevOps, Inactive). |
| D3 | Tiket dapat ditujukan ke satu role atau ke semua orang. Semua user dengan role tujuan dinotifikasi saat tiket dibuat dan dapat mengambil tiket tersebut. |
| D4 | Saat developer menyelesaikan tiket, QA dinotifikasi. QA memvalidasi tiket (Closed) atau me-reopen-nya. |

Item terbuka di bawah dikunci memakai asumsi default. Mohon konfirmasi atau koreksi; revisi berikutnya dikerjakan dalam satu pass.

| ID | Hal yang ambigu | Asumsi default di PRD ini | Dampak jika berbeda |
| --- | --- | --- | --- |
| Q1 | **Vercel Hobby hanya untuk penggunaan non-komersial.** Tool internal perusahaan kemungkinan dianggap komersial | MVP tetap di Hobby; ketentuan Vercel diverifikasi sebelum build | Jika dianggap komersial, wajib Vercel Pro atau host lain (batasan di Bagian 5 sebagian besar hilang) |
| Q2 | Login dan user baru | Login hanya via Discord OAuth2, dibatasi anggota 1 guild. User baru otomatis dibuat dengan role **Inactive** sampai Admin menetapkan role | Jika user baru langsung aktif, perlu role default (mis. FE) |
| Q3 | Cara menetapkan Admin (tidak ada di opsi menu role) | Admin pertama dari env var `ADMIN_DISCORD_IDS`; Admin dapat mengangkat Admin lain dari menu | Jika Admin hanya dari env var, opsi Admin dihapus dari menu |
| Q4 | Hak PM | PM boleh mengelola master project, melihat dashboard, assign/reassign, dan membatalkan tiket | Jika master project hanya Admin, hak PM dikurangi |
| Q5 | Satu user punya berapa role? | Satu role per user | Jika multi-role (mis. BE + DevOps), model data dan notifikasi berubah |
| Q6 | Cara notifikasi ke banyak user | Satu pesan di channel project (fallback channel global) yang menyebut (mention) semua user target; DM hanya opsional | DM massal per user perlu antrean karena batas durasi fungsi Vercel dan rate limit Discord |
| Q7 | Validasi QA | Berlaku untuk semua tipe tiket. QA tidak memvalidasi tiket yang ia selesaikan sendiri; Admin/PM menggantikan | Jika tipe tertentu (mis. Pertanyaan) boleh langsung Closed, perlu aturan per tipe |
| Q8 | Visibilitas tiket | Semua user aktif melihat semua project dan tiket (tim internal) | Jika dibatasi per project, perlu tabel keanggotaan project |
| Q9 | Lampiran file dan SLA | Tidak ada lampiran di MVP; SLA hanya penanda overdue dari tenggat | Lampiran perlu Vercel Blob/S3 (body request maks. ≈4,5 MB); SLA ketat perlu scheduler |
| Q10 | Stack, bahasa, dan skala | Next.js (App Router) + TypeScript, Postgres (Neon), Drizzle ORM, Auth.js; UI Bahasa Indonesia; ≤ 50 user dan ≤ 5.000 tiket/tahun | Backend Go memisah frontend/backend; skala lebih besar perlu tinjau ulang batas free tier |

## 3. Tujuan dan Non-Tujuan

**Tujuan**

- Satu sumber kebenaran untuk permintaan kerja per project beserta status dan riwayatnya.
- Mempercepat pembuatan, pengambilan, dan pengecekan tiket langsung dari Discord, dengan tiket sampai ke role yang tepat dan divalidasi QA sebelum ditutup.
- Memberi manajemen visibilitas beban kerja, backlog, dan kecepatan penyelesaian.
- Berjalan stabil di Vercel Free tanpa biaya infrastruktur.

**Non-tujuan (MVP)**

- Lampiran file, SLA dengan eskalasi otomatis, laporan terjadwal via email, multi-tenant/multi-organisasi, pengguna di luar tim IT, satu user dengan banyak role, aplikasi mobile native, bot Discord yang online terus-menerus (Gateway).

## 4. Persona dan Peran

| Role | Kelompok | Hak utama |
| --- | --- | --- |
| **Admin** | Sistem | Semua fitur: kelola user dan role, master project, konfigurasi notifikasi; dapat mengambil, assign, atau memvalidasi tiket apa pun |
| **PM** | Manajemen | Kelola master project, dashboard, assign/reassign, ubah role tujuan, batalkan tiket; menggantikan QA bila tiket dikerjakan QA |
| **QA** | Validator | Buat tiket, ambil tiket yang ditujukan ke QA, menerima notifikasi tiket Resolved, validasi (Closed) atau reopen |
| **BE, FE, AI, DevOps** | Developer | Buat tiket, ambil tiket yang ditujukan ke role-nya atau ke Semua, ubah status, komentar, selesaikan tiket |
| **Inactive** | Nonaktif | Tidak dapat login atau memakai perintah Discord; riwayat tiketnya tetap tersimpan |

Semua role aktif dapat membuat tiket.

## 5. Batasan Vercel Free Plan dan Implikasi Desain

Angka batas dapat berubah; **verifikasi ke dokumentasi Vercel saat implementasi dimulai.**

| Batasan | Implikasi pada desain |
| --- | --- |
| Penggunaan non-komersial saja (Hobby) | Lihat Q1; harus dikonfirmasi sebelum build |
| Tidak ada proses long-running / WebSocket persisten | **Tidak memakai bot Discord Gateway.** Integrasi memakai *Discord Interactions* (slash command via HTTP webhook) dan REST API untuk mengirim pesan |
| Discord mewajibkan respons interaksi ≤ 3 detik | Handler cepat: verifikasi signature Ed25519, jawab langsung atau kirim *deferred response* lalu *follow-up* |
| Durasi eksekusi fungsi terbatas | Semua operasi dibuat singkat; tidak ada job panjang, sehingga notifikasi tiket dikirim sebagai satu pesan channel dengan mention, bukan DM massal. Query dashboard harus dioptimalkan (agregasi SQL + index) |
| Cron job terbatas (Hobby: maks. sekali per hari, waktu tidak presisi) | Tidak ada pengingat/eskalasi real-time. Penanda *overdue* dihitung saat query, bukan oleh scheduler |
| Tidak ada filesystem persisten | Semua data di database eksternal; tidak menyimpan file lokal |
| Cold start pada fungsi serverless | Hindari dependensi berat; gunakan koneksi database serverless-friendly (pooling/HTTP driver) |
| Batas ukuran body request (≈4,5 MB) | Mendukung keputusan tanpa lampiran di MVP |
| Database tidak termasuk | Gunakan Postgres tier gratis (mis. Neon via Vercel Marketplace); perhatikan batas storage dan compute |
| Kuota bandwidth/invokasi bulanan | Pakai caching (ISR/`revalidate`) untuk dashboard; hindari polling agresif dari klien |
| Satu seat developer di Hobby | Kolaborasi deploy tim terbatas; pertimbangkan repo + preview terpisah |

## 6. Kebutuhan Fungsional

### 6.1 Master Data Project

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-P1 | Admin dan PM dapat membuat, mengubah, dan menonaktifkan project (tidak hapus permanen jika sudah punya tiket) | Must |
| FR-P2 | Atribut project: kode unik (mis. `WMS`), nama, deskripsi, status (aktif/nonaktif), PIC/owner, tanggal dibuat | Must |
| FR-P3 | Kode project dipakai sebagai prefix nomor tiket (mis. `WMS-0042`) | Must |
| FR-P4 | Semua user aktif dapat melihat semua project aktif dan membuat tiket di dalamnya (tanpa keanggotaan per project) | Must |
| FR-P5 | Setiap project dapat dikaitkan ke satu channel Discord untuk notifikasi; bila kosong dipakai channel global dari pengaturan | Must |
| FR-P6 | Daftar project dengan pencarian, filter status, dan pagination | Must |

**Kriteria penerimaan:** kode project unik dan tidak bisa diubah setelah ada tiket; project nonaktif tidak dapat menerima tiket baru namun tiket lama tetap dapat dilihat.

### 6.2 Tiket: Pembuatan, Pengerjaan, Penyelesaian, dan Daftar

**Atribut tiket:** nomor tiket, project, judul, deskripsi, tipe (Bug, Request, Task, Pertanyaan), prioritas (Low, Medium, High, Critical), status, **role tujuan** (PM, QA, BE, FE, AI, DevOps, atau Semua), reporter, assignee, validator (QA), jumlah reopen, tenggat (opsional), tanggal dibuat/diambil/diselesaikan/ditutup, sumber (Web/Discord).

**Alur status**

`Open` → `In Progress` → `Resolved` (selesai oleh developer, menunggu QA) → `Closed` (divalidasi QA). QA dapat mengembalikan `Resolved` → `In Progress` (reopen).

| Dari | Ke | Siapa | Syarat |
| --- | --- | --- | --- |
| Open | In Progress | User ber-role tujuan (siapa saja bila Semua); Admin | Mengambil tiket; pengambil pertama menang |
| In Progress | Resolved | Assignee; PM; Admin | Catatan penyelesaian wajib |
| Resolved | Closed | QA (bukan yang menyelesaikan); PM; Admin | Validasi; catatan opsional |
| Resolved | In Progress | QA; PM; Admin | Reopen; alasan wajib; assignee tetap |
| In Progress | Open | PM; Admin; otomatis bila assignee di-Inactive-kan | Assignee dikosongkan |
| Open, In Progress | Cancelled | PM; Admin | Alasan wajib |

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-T1 | **Pembuatan:** semua user aktif membuat tiket dengan memilih project, mengisi judul, deskripsi, tipe, prioritas, dan role tujuan (satu role atau Semua); nomor tiket dibuat otomatis | Must |
| FR-T2 | Tiket baru berstatus `Open` tanpa assignee dan memicu notifikasi ke semua user aktif ber-role tujuan (semua user aktif bila Semua) | Must |
| FR-T3 | **Pengambilan:** user ber-role tujuan (siapa saja bila Semua) dapat mengambil tiket dari web atau Discord; status menjadi `In Progress` dan waktu mulai tercatat. Pengambilan bersifat atomik: pengambil pertama menang, yang lain mendapat pesan "sudah diambil oleh X" | Must |
| FR-T4 | Halaman "Tiket Tersedia": tiket `Open` tanpa assignee yang ditujukan ke role saya atau Semua | Must |
| FR-T5 | PM/Admin dapat assign/reassign tiket ke user mana pun dan mengubah role tujuan; assignee baru dinotifikasi | Must |
| FR-T6 | Komentar/catatan progres pada tiket (teks, urut waktu) | Must |
| FR-T7 | **Penyelesaian:** assignee menandai `Resolved` dengan catatan penyelesaian wajib; waktu selesai tercatat | Must |
| FR-T8 | Saat `Resolved`, semua user ber-role QA dinotifikasi dan dapat langsung memvalidasi atau me-reopen dari notifikasi | Must |
| FR-T9 | **Validasi QA:** QA menyetujui tiket sehingga status menjadi `Closed`; validator dan waktu validasi tercatat. QA tidak dapat memvalidasi tiket yang ia selesaikan sendiri (diganti PM/Admin) | Must |
| FR-T10 | **Reopen:** QA (atau PM/Admin) mengembalikan tiket `Resolved` ke `In Progress` dengan alasan wajib; assignee yang sama dinotifikasi dan jumlah reopen bertambah | Must |
| FR-T11 | Riwayat aktivitas (audit trail) untuk setiap perubahan status, assignee, role tujuan, prioritas, dan tenggat | Must |
| FR-T12 | **Daftar tiket:** tabel dengan pencarian (judul/nomor), filter (project, status, prioritas, assignee, reporter, role tujuan, tipe, rentang tanggal), sort, pagination server-side | Must |
| FR-T13 | Tampilan "Tiket Saya" (ditugaskan ke saya / dibuat oleh saya) dan "Menunggu Validasi" untuk QA | Should |
| FR-T14 | Penanda *overdue* jika melewati tenggat dan belum `Resolved` | Should |
| FR-T15 | PM/Admin dapat membatalkan tiket (`Cancelled`) dengan alasan | Should |
| FR-T16 | Ekspor daftar tiket ke CSV (sesuai filter aktif) | Could |

**Aturan akses:** semua user aktif dapat membuat tiket dan melihat semua tiket. Status diubah oleh assignee; assign/reassign dan pembatalan oleh PM/Admin; validasi dan reopen oleh QA (PM/Admin sebagai pengganti). User `Inactive` tidak dapat login maupun memakai perintah Discord.

### 6.3 Dashboard Manajemen

Diakses oleh PM dan Admin. Filter global: rentang tanggal (default 30 hari) dan project (satu/banyak).

| ID | Komponen | Keterangan | Prioritas |
| --- | --- | --- | --- |
| FR-D1 | Kartu ringkasan | Total tiket, Open (belum diambil), In Progress, Menunggu validasi QA (Resolved), Closed, Overdue, tiket Critical aktif | Must |
| FR-D2 | Tren tiket | Grafik tiket dibuat vs ditutup per hari/minggu | Must |
| FR-D3 | Distribusi | Tiket per project, per prioritas, per tipe, per status, per role tujuan | Must |
| FR-D4 | Beban kerja | Jumlah tiket aktif per assignee dan per role; tiket Open belum diambil per role tujuan | Must |
| FR-D5 | Kecepatan | Median dan rata-rata waktu ambil (Open→In Progress), waktu pengerjaan (In Progress→Resolved), dan waktu validasi QA (Resolved→Closed) | Must |
| FR-D6 | Kualitas | Jumlah dan persentase tiket yang di-reopen, per project dan per role | Must |
| FR-D7 | Aging backlog | Tiket aktif per rentang umur (0–3, 4–7, 8–14, >14 hari) | Should |
| FR-D8 | Daftar perhatian | Tiket Critical/High, overdue, Open belum diambil > N hari, dan Resolved belum divalidasi > N hari, dengan tautan ke detail | Must |
| FR-D9 | Drill-down | Klik kartu/grafik membuka daftar tiket dengan filter yang sesuai | Should |
| FR-D10 | Penanda waktu data terakhir diperbarui | Should |  |

**Catatan teknis (Vercel Free):** metrik dihitung dengan agregasi SQL di server, di-cache singkat (mis. 60–300 detik) untuk menekan invokasi dan beban database; tidak ada polling otomatis dari klien (refresh manual).

### 6.4 Integrasi Discord

#### a. Login dengan Discord

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-X1 | Login via Discord OAuth2 (scope `identify`, `email`, `guilds.members.read` bila perlu cek keanggotaan) | Must |
| FR-X2 | Hanya anggota guild yang dikonfigurasi yang boleh masuk; selain itu ditolak dengan pesan jelas | Must |
| FR-X3 | Akun dibuat otomatis saat login pertama dengan role `Inactive`, kecuali Discord ID sudah didaftarkan Admin (FR-U3). User Inactive melihat halaman "menunggu aktivasi oleh Admin" | Must |
| FR-X4 | Discord user ID menjadi identitas penghubung antara akun web dan perintah di Discord; role selalu dibaca dari database | Must |
| FR-X5 | Sesi berbasis cookie aman (HttpOnly, Secure, SameSite) | Must |

#### b. Transaksi Tiket dari Discord (Slash Command)

| Perintah | Fungsi | Akses |
| --- | --- | --- |
| `/ticket create` | Opsi project, tipe, prioritas, dan role tujuan, lalu modal judul dan deskripsi; tiket dibuat dan notifikasi terkirim | Semua role aktif |
| `/ticket take <nomor>` | Mengambil tiket (assign ke diri sendiri, status `In Progress`); tersedia juga sebagai tombol "Ambil Tiket" pada notifikasi | User ber-role tujuan (siapa saja bila Semua), Admin |
| `/ticket resolve <nomor>` | Modal catatan penyelesaian, lalu status `Resolved` | Assignee, PM, Admin |
| `/ticket validate <nomor>` | Validasi tiket menjadi `Closed`; tersedia juga sebagai tombol "Validasi" pada notifikasi | QA, PM, Admin |
| `/ticket reopen <nomor>` | Modal alasan, lalu status kembali `In Progress`; tersedia juga sebagai tombol "Reopen" | QA, PM, Admin |
| `/ticket comment <nomor>` | Menambah komentar | Semua role aktif |

#### c. Cek Status Tiket

| Perintah | Fungsi |
| --- | --- |
| `/ticket status <nomor>` | Menampilkan embed: judul, project, status, prioritas, role tujuan, assignee, validator, waktu dibuat/diubah, tautan ke web |
| `/ticket mine` | Daftar tiket aktif milik/ditugaskan ke pemanggil (maks. 10, dengan tautan) |
| `/ticket available` | Daftar tiket `Open` yang ditujukan ke role pemanggil atau Semua (maks. 10) |
| `/ticket list [project] [status]` | Daftar ringkas tiket sesuai filter (maks. 10) |

#### d. Notifikasi Keluar

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-X6 | **Tiket dibuat:** pesan ke channel project yang menyebut (mention) semua user aktif ber-role tujuan (semua user aktif bila Semua), dengan tombol "Ambil Tiket" | Must |
| FR-X7 | **Tiket diambil:** pesan notifikasi awal diperbarui (tombol dinonaktifkan, assignee ditampilkan) | Must |
| FR-X8 | **Tiket Resolved:** pesan ke channel project yang menyebut semua user ber-role QA, dengan tombol "Validasi" dan "Reopen" | Must |
| FR-X9 | **Reopen:** pesan yang menyebut assignee beserta alasan reopen | Must |
| FR-X10 | **Tiket Closed:** pemberitahuan ke assignee dan reporter | Should |
| FR-X11 | **Assign/reassign oleh PM/Admin:** pesan yang menyebut assignee baru | Should |
| FR-X12 | Kegagalan pengiriman notifikasi tidak menggagalkan transaksi tiket (dicatat, tidak di-retry di MVP) | Must |
| FR-X13 | DM ke assignee sebagai tambahan opsional | Could |

**Aturan integrasi:**

- Seluruh slash command, klik tombol, dan submit modal diterima di satu endpoint HTTP `POST /api/discord/interactions` dengan verifikasi signature Ed25519 (header `X-Signature-Ed25519` dan `X-Signature-Timestamp`) pada setiap request; request tanpa signature valid ditolak 401.
- `custom_id` tombol memuat aksi dan nomor tiket, tetapi tidak dipercaya: peran dan hak pemanggil dicek ulang dari database pada setiap klik.
- Pengambilan tiket memakai pembaruan atomik (`UPDATE ... WHERE assignee_id IS NULL AND status = 'Open'`); klik kedua mendapat pesan ephemeral "sudah diambil".
- Pesan notifikasi disimpan (`discord_channel_id`, `discord_message_id`) agar dapat diperbarui. Mention memakai `allowed_mentions`; bila daftar target melebihi batas 2.000 karakter per pesan, dipecah menjadi beberapa pesan.
- Pengguna Discord yang belum pernah login ke web menerima pesan *ephemeral* berisi tautan login; user `Inactive` menerima pesan bahwa akunnya belum diaktifkan Admin.
- Respons berisi data tiket bersifat *ephemeral* secara default kecuali dipilih publik.
- Pendaftaran slash command dilakukan lewat skrip satu kali (bukan saat runtime).
- Rate limit Discord REST ditangani dengan membaca header `Retry-After`; tidak ada antrean di MVP.

### 6.5 Manajemen User dan Role (Admin)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| FR-U1 | Menu "Pengguna" berisi daftar user Discord yang pernah login (username, Discord ID, role, login terakhir) dengan pencarian dan filter role | Must |
| FR-U2 | Admin mengubah role user menjadi Admin, PM, QA, BE, FE, AI, DevOps, atau Inactive | Must |
| FR-U3 | Admin dapat mendaftarkan user lebih dulu dengan memasukkan Discord ID dan role, sehingga user langsung aktif saat login pertama | Should |
| FR-U4 | User baru tanpa pra-registrasi muncul di daftar "Menunggu role" dengan role `Inactive` | Must |
| FR-U5 | Perubahan role berlaku pada request berikutnya (role dibaca dari database, bukan dari sesi) dan tercatat: siapa, kapan, dari dan ke role apa | Must |
| FR-U6 | Sistem menolak menurunkan atau menonaktifkan Admin terakhir | Must |
| FR-U7 | Bila user di-Inactive-kan, tiket `In Progress` miliknya kembali ke `Open` tanpa assignee dan dinotifikasi ulang ke role tujuan | Should |
| FR-U8 | Admin pertama ditetapkan dari env var `ADMIN_DISCORD_IDS` | Must |

## 7. Model Data (Tingkat Konsep)

| Entitas | Atribut utama |
| --- | --- |
| `users` | id, discord\_id (unik), username (kosong sampai login pertama), avatar, email, role (admin/pm/qa/be/fe/ai/devops/inactive), last\_login\_at, created\_at |
| `user_role_events` | id, user\_id, changed\_by, from\_role, to\_role, created\_at |
| `projects` | id, code (unik), name, description, owner\_id, discord\_channel\_id, is\_active, created\_at |
| `tickets` | id, project\_id, seq\_no, number (mis. WMS-0042), title, description, type, priority, status, target\_role (pm/qa/be/fe/ai/devops/all), reporter\_id, assignee\_id, validator\_id, reopen\_count, due\_at, source (web/discord), discord\_channel\_id, discord\_message\_id, created\_at, updated\_at, started\_at, resolved\_at, closed\_at |
| `ticket_comments` | id, ticket\_id, author\_id, body, source, created\_at |
| `ticket_events` | id, ticket\_id, actor\_id, event\_type (created, taken, assigned, resolved, validated, reopened, cancelled, released), from\_value, to\_value, note, created\_at |
| `app_settings` | key, value (mis. channel notifikasi global, ambang N hari untuk daftar perhatian) |
| `discord_interaction_log` | id, interaction\_id (unik), command, user\_id, status, created\_at (untuk idempotensi dan debugging; retensi pendek) |

**Indeks penting:** `tickets(project_id, status)`, `tickets(assignee_id, status)`, `tickets(status, target_role)`, `tickets(created_at)`, `tickets(number)` unik, `users(discord_id)` unik, `ticket_events(ticket_id, created_at)`.

**Penomoran tiket:** `seq_no` per project dibuat dalam transaksi database (hindari race condition) lalu diformat dengan kode project.

## 8. Arsitektur Tingkat Tinggi

- **Frontend + backend:** Next.js (App Router, TypeScript) di Vercel; Server Components/Route Handlers untuk API.
- **Database:** PostgreSQL serverless (tier gratis) dengan driver yang ramah serverless.
- **Auth dan otorisasi:** Auth.js dengan provider Discord; sesi dalam cookie, sedangkan role dibaca dari database pada setiap request dan setiap interaksi Discord.
- **Discord:** endpoint Interactions (webhook) + Discord REST untuk notifikasi; tanpa Gateway.
- **Konfigurasi:** environment variables Vercel (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `ADMIN_DISCORD_IDS`, `DATABASE_URL`, `AUTH_SECRET`); channel notifikasi global di `app_settings`.
- **Lingkungan:** Preview (per branch) dan Production, dengan database terpisah.

## 9. Kebutuhan Non-Fungsional

| Aspek | Target |
| --- | --- |
| Performa | Halaman daftar dan detail tiket < 2 detik (p95) pada data ≤ 5.000 tiket; dashboard < 3 detik dengan cache |
| Discord | Respons awal interaksi < 3 detik (p95 < 1,5 detik); gunakan deferred response bila perlu |
| Keamanan | Verifikasi signature Discord, otorisasi per role di setiap endpoint dan interaksi Discord (server-side, perubahan role langsung berlaku), validasi input dengan skema, proteksi CSRF, secret hanya di environment variable, query berparameter |
| Privasi | Simpan data Discord seminimal mungkin (ID, username, avatar, email); tidak menyimpan token OAuth lebih dari yang diperlukan |
| Ketersediaan | Mengikuti SLA platform free tier; tidak ada jaminan formal |
| Auditabilitas | Semua perubahan status dan assignment tercatat di `ticket_events` |
| Aksesibilitas | Kontras dan navigasi keyboard dasar (WCAG AA sebagai acuan) |
| Responsif | Dapat dipakai di desktop dan layar mobile |
| Observabilitas | Log error server via Vercel logs; log interaksi Discord singkat |

## 10. Metrik Keberhasilan

- ≥ 80% tiket dibuat melalui kanal yang disepakati dalam 1 bulan setelah rilis (web atau Discord).
- Median waktu pengambilan tiket (Open→In Progress) turun dibanding baseline sebelum aplikasi.
- Manajemen dapat menjawab "berapa backlog per project dan siapa yang overload" tanpa meminta laporan manual.
- Tingkat kegagalan interaksi Discord < 1%, dan tiket Resolved tidak menumpuk menunggu validasi QA (ambang hari ditetapkan saat UAT).

## 11. Rencana Rilis

| Fase | Cakupan | Keluaran |
| --- | --- | --- |
| **M1 — Fondasi** | Setup repo, deploy Vercel, database, skema, login Discord, manajemen user dan role, master data project | Login berjalan, role dapat diatur Admin, project dapat dikelola |
| **M2 — Tiket** | Pembuatan tiket dengan role tujuan, pengambilan atomik, penyelesaian, validasi/reopen QA, komentar, audit trail, daftar + filter | Siklus tiket lengkap di web |
| **M3 — Discord** | Endpoint Interactions, `/ticket create`, `/ticket status`, `/ticket mine`, `/ticket available`, notifikasi dengan mention dan tombol Ambil/Validasi/Reopen | Transaksi, pengambilan, validasi, dan cek status dari Discord |
| **M4 — Dashboard** | Kartu, tren, distribusi, beban kerja, kecepatan, kualitas (reopen), daftar perhatian, caching | Dashboard manajemen |
| **M5 — Penyempurnaan** | `/ticket take`/`resolve`/`validate`/`reopen`/`comment`, DM opsional, ekspor CSV, UAT, perbaikan | Rilis MVP |

## 12. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Tool internal perusahaan dianggap penggunaan komersial sehingga melanggar ketentuan Hobby | Konfirmasi Q1 sejak awal; siapkan jalur upgrade ke Pro (tanpa perubahan arsitektur) |
| Timeout interaksi Discord (3 detik) akibat cold start/query lambat | Deferred response, query ringan, index, koneksi database efisien |
| Dua user mengambil tiket yang sama bersamaan | Pembaruan atomik di database; pengambil kedua mendapat pesan "sudah diambil" |
| Notifikasi mention terlalu ramai atau melebihi batas pesan | Hanya user aktif ber-role tujuan yang disebut; pesan dipecah bila melebihi 2.000 karakter; tiket "Semua" dipakai seperlunya |
| QA menjadi bottleneck validasi | Notifikasi ke seluruh QA, daftar "Menunggu Validasi", dan metrik waktu validasi di dashboard |
| Batas storage/compute database gratis terlampaui | Retensi log pendek, monitoring penggunaan, rencana migrasi/upgrade |
| Kuota Vercel Hobby habis | Cache dashboard, tanpa polling, pantau penggunaan |
| Tidak ada scheduler presisi sehingga tanpa pengingat otomatis | Penanda overdue dihitung saat query; pengingat bukan cakupan MVP |
| Kebocoran data tiket lewat Discord | Respons ephemeral default, otorisasi tiap perintah dan tombol dari database, hanya user aktif yang dilayani |
| Ketergantungan pada Discord (outage/perubahan API) | Web tetap fungsional penuh tanpa Discord kecuali login; pertimbangkan login cadangan |

## 13. Di Luar Cakupan MVP (Backlog)

Lampiran file, SLA dengan eskalasi otomatis, pengingat terjadwal, laporan email berkala, template tiket, tag/label kustom, relasi antar tiket, integrasi Slack/email, webhook keluar umum, dan multi-organisasi.
