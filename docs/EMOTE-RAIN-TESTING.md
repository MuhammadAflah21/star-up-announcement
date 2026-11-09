# Hasil audit dan pengujian Emote Rain

Revisi terbatas, 30 Oktober 2026. Source: ZIP terbaru pengguna.

## Akar masalah yang dibuktikan

Browser menjalankan source asli dengan respons mock accepted HTTP200 yang valid. Hasilnya beralih ke error, dan instrumentasi menangkap `effectsLayer is not defined`. Penyebabnya fungsi global `playResultEffects()` mengakses `effectsLayer` dan `clearResultEffects()` yang hanya tersedia di dalam IIFE. Elemen `#result-effects` juga belum ada. Bukan bukti bahwa koneksi Supabase rusak.

`renderResult()` kini hanya merender data. Efek dipanggil setelah state hasil berhasil terlihat, dengan isolasi exception/rejection. Script atau layer efek yang tidak tersedia tidak menghalangi hasil/CP.

## File yang diubah/ditambah

| File | Perubahan terbatas |
|---|---|
| `index.html` | Layer aria-hidden untuk emote rain dan satu script deferred |
| `js/main.js` | Hapus efek salah scope, integrasi play/clear terisolasi setelah hasil, cleanup dan logging |
| `js/result-effects.js` (baru) | Controller PNG, cache, pembatalan preload, partikel terbatas, cleanup, reduced motion |
| `css/animation.css` | Ganti hanya selector/keyframes efek berjatuhan lama; animasi existing lain dipertahankan |
| `tests/backend.test.mjs` | Sesuaikan tes CP lama yang masih mengharapkan environment dengan query database aktual; tambah regresi error koneksi/CP dan fixture pemetaan 5/6 |
| `assets/images/effects/README.md` (baru) | Nama delapan slot PNG; tidak menyertakan gambar |
| `docs/EMOTE-RAIN.md`, `docs/EMOTE-RAIN-TESTING.md` (baru) | Panduan dan laporan revisi ini |

Tidak ada perubahan runtime di luar scope. File konfigurasi pribadi `.env.loval`, node_modules, .git, .vercel, cache, backup, dan ZIP lain tidak disertakan sesuai instruksi. `.env.example` tetap dipertahankan tanpa perubahan nilai.

Endpoint `api/cek-nim.mjs`, rate limiter, helper CP, animasi gacha, CSS style/responsive, package.json, package-lock, serta seluruh 14 file aset existing dibandingkan dan byte-identik dengan source. Tidak mengubah query, tabel, pemetaan, nomor CP, environment, batas rate limit, layout, atau dekorasi.

## Pengujian aktual

**54 tes Node lulus** (`npm test`) memakai SDK Supabase dari dependency ZIP dan HTTP mock terisolasi. Tes mencakup accepted/not-accepted/not-found, validasi 9 karakter, uppercase/leading zero, input/metode/content type invalid, environment tidak tersedia, query/koneksi/CP gagal, RPC gagal, hashing IP, lima request lalu HTTP429/Retry-After, request bersamaan, pemulihan setelah expiry mock, CP null/perubahan data, dan 11 fixture divisi dipetakan ke dua CP (5/6). Tes helper environment lama tetap dijalankan, tetapi helper itu bukan sumber CP pada endpoint aktual.

Tes awal source menunjukkan 50/51 lulus: satu tes CP lama gagal karena mengharapkan environment padahal endpoint sudah memakai database. Yang disesuaikan adalah tesnya, bukan mekanisme CP.

**47 pemeriksaan browser lulus** menggunakan Playwright/Chromium 153.0.8010.0:

- 27 pemeriksaan reproduksi error/fungsional: accepted dengan 4/2/0 gambar, not-accepted 4/0 gambar; seluruh empat file yang tersedia ikut dipakai; no broken image; cache aset hilang tanpa request berulang; CP tetap benar.
- Tidak ada efek/request gambar efek pada landing, checking, not-found, 429, 503, error; gacha existing tetap berganti; double-submit hanya satu request.
- Cleanup alami, reset, pencarian berulang, perpindahan happy→sad→not-found, preload terlambat/hang, pagehide, tab disembunyikan, reduced motion awal/perubahan saat berjalan.
- Fault injection: fungsi efek melempar exception, Promise efek reject, script hilang, dan layer DOM hilang; hasil accepted/CP tetap muncul.
- Resize aktif pada 320/360/390/430/768/1366 px: tidak menambah horizontal overflow, tombol tetap dapat menerima klik.
- Input invalid tidak mengirim request; malformed JSON, jaringan gagal, dan timeout nyata 12 detik menghasilkan error tanpa emote rain. Tidak ada exception JavaScript tidak tertangani dalam pengujian versi perbaikan. Kegagalan yang sengaja disuntikkan menghasilkan log sesuai kategori.
- Tidak ada timer aplikasi tersisa setelah cleanup/reset yang diperiksa. DOM partikel terbatas 12 mobile/18 desktop, tidak digandakan ketika play dipanggil berulang. Efek tidak menerima fokus/klik dan memakai aria-hidden.

**20 perbandingan visual/layout**: landing, accepted, not-accepted, not-found, rate-limited pada 320, 390, 768, 1366 px. Geometri elemen utama, dekorasi, dan gambar hasil harus identik. Perbandingan piksel UI memakai toleransi 0,1% untuk antialiasing browser; konten raster gambar existing dikecualikan dari hitungan piksel UI karena sampling gambar tidak deterministik, tetapi geometri gambar dibandingkan dan file aset diperiksa byte-identik. Animasi dibekukan hanya pada harness QA untuk perbandingan stabil, tidak pada source proyek.

Baseline accepted/not-accepted menggunakan source awal dengan satu panggilan efek rusak dinetralkan di harness QA, agar layout awal dapat ditampilkan. Tidak mengubah HTML/CSS baseline. Pengujian fungsional memakai respons API dan PNG teknis dari interceptor lokal; tidak ada fixture tersebut di frontend/ZIP production. Screenshot hanya artefak QA internal.

## Batas dan temuan di luar scope

- Tidak mengakses Supabase asli, SQL RPC, nomor WA asli, atau deployment. Hasil tes mock tidak membuktikan atomicity SQL/konfigurasi hosting nyata. Tidak mengasumsikan NIM fixture ada di database pengguna.
- Safari/Firefox dan perangkat HP fisik belum diuji.
- Dua PNG coral existing berukuran 12.537 × 16.107 piksel (sekitar 202 juta piksel masing-masing), sehingga rendering browser dapat berat. Aset tetap utuh; optimasi tidak dilakukan karena dilarang dalam scope ini.
- ZIP awal memiliki `.env.loval` (typo). File ini tidak otomatis menjadi `.env.local`; pertahankan nilai konfigurasi yang benar di environment lokal/hosting. Secret tidak disertakan di ZIP hasil.
- Beberapa path dekorasi existing tidak memiliki file. Hal ini tidak diubah. File efek yang belum dimasukkan dapat menghasilkan 404 satu kali per slot per halaman; tidak menghasilkan broken image atau exception aplikasi.
- Dokumentasi/helper lama tentang CP environment dan file data kosong yang tidak digunakan endpoint tetap dipertahankan. Rujuk `docs/EMOTE-RAIN.md` untuk alur CP database aktual.
