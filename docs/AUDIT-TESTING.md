# Audit koreksi sesuai referensi

25 Oktober 2026. Revisi ini mengikuti koreksi terakhir pengguna dan screenshot `Screenshot 2026-10-25 140848(2).png`.

## Perubahan

- Accepted: gambar overlap di tengah atas kartu, “SELAMAT KAMU LOLOS!”, nama peserta, tanpa nama divisi/status tambahan. Cek NIM lainnya di kiri dan Contact Person di kanan, satu baris di mobile maupun desktop. Nama panjang membungkus; kartu tidak memakai tinggi tetap.
- Not-accepted: gambar sedih overlap, “YAHHH...”, “Kamu belum lolos, tetep semangat yah..”, satu tombol reset.
- Not-found: gambar berpikir overlap, “HMMM...”, “NIM tidak ditemukan.”, satu tombol reset; tanpa data hasil sebelumnya.
- Buka hasil dan Cek NIM lainnya menggunakan satu aturan gradient biru yang sama, termasuk saat hover.
- CP hanya dua: kelompok pertama tepat 5 divisi, kedua tepat 6. Konfigurasi server kosong sesuai pilihan pengguna. Tidak mengarang nama divisi/nomor. Tidak ada lagi query kontak per divisi ke tabel koordinator.
- Background, judul STAR UP, aset, validasi, gacha, rate limit, dan pencarian peserta yang sudah ada dipertahankan. Tidak membuat database atau deployment baru.

## File yang berubah dari revisi sebelumnya

| File | Tujuan |
|---|---|
| `index.html` | Menghapus baris divisi/status; reset di kiri, CP di kanan; label hasil |
| `css/style.css` | Proporsi/overlap kartu, dua tombol satu baris, gradient tombol yang sama |
| `css/responsive.css` | Menghapus aturan font tombol mobile yang bertabrakan |
| `js/main.js` | Render tanpa divisi, headline/pesan sesuai referensi, reset data |
| `api/cek-nim.mjs` | Memakai pemetaan dua CP dari konfigurasi server |
| `lib/contact-person.mjs` | Resolver baru untuk kelompok 5 dan 6 divisi |
| `.env.example` | Empat konfigurasi CP kosong |
| `tests/backend.test.mjs`, `tests/contact-person.test.mjs` | Kontrak API dan pemetaan dua CP |
| `README.md`, `docs/BACKEND.md`, `docs/ASSETS.md`, `docs/AUDIT-TESTING.md` | Panduan yang sesuai implementasi final |

Seluruh file aset dibandingkan dengan sumber dan dipertahankan byte-identik. Tidak mengganti nama/path gambar atau menambahkan gambar.

## Hasil pengujian

**105 pemeriksaan browser lulus** menggunakan Playwright dengan Chromium 153.0.8010.0. **51 tes Node/API/CP lulus**, memakai SDK Supabase dengan HTTP mock, tanpa menghubungi database asli.

Lebar browser: **320, 360, 375, 390, 414, 430, 768, 1024, 1440 px**. Pada masing-masing ukuran diperiksa landing, accepted, not-accepted, not-found, rate-limited, service-unavailable, dan error. Screenshot dibuat untuk pemeriksaan; screenshot accepted 320 px dan hasil mobile diperiksa secara visual.

Pemeriksaan meliputi:

- Tidak ada horizontal overflow atau gambar rusak. Judul centered. Tombol hasil minimal 48 px tinggi.
- Kedua tombol accepted sejajar dan sama lebar, reset di kiri; label Contact Person tidak meluber. Tanpa elemen/teks divisi pada kartu.
- Gambar hasil asli centered dan overlap batas atas kartu; headline tidak tertutup. Nama panjang membungkus.
- Gradient tombol utama/reset sama pada kondisi normal/hover.
- Kontak hilang/invalid tidak tampil; URL WhatsApp hanya dari nomor valid. Reset membersihkan nama dan URL lama.
- Input invalid tidak membuat request; uppercase dan leading zero tetap string. Tidak mengubah aturan validasi dari sumber terbaru pada koreksi ini.
- HTML dari respons menjadi teks. Respons rusak, NIM respons berbeda, status tidak dikenal, dan field wajib kosong menjadi error.
- HTTP429 dan Retry-After (detik/tanggal) dibedakan dari 503/error; respons HTTP500 berisi accepted tetap error.
- Gacha berganti tiga gambar dan berhenti sesuai status API; reduced motion, cancel, reset, error, timeout 12 detik, dan respons terlambat diuji.
- Lima submit cepat hanya satu request. Tidak ada timer aplikasi tersisa, view ganda, atau exception JavaScript dalam pengujian.
- Viewport pendek 390×400 tetap dapat scroll; reset memfokuskan input. Aset hilang, fallback WebP, orb netral, dan script animasi hilang ditangani.
- Seluruh 11 fixture divisi diarahkan ke CP yang benar (5/6). Konfigurasi kosong/tidak lengkap, duplikat, tumpang tindih, nomor invalid/sama, dan divisi tidak dikenal menghasilkan null. Query tabel koordinator tidak dijalankan.

## Konfigurasi dan batas pengujian

Isi `CP_1_DIVISIONS`, `CP_1_WHATSAPP`, `CP_2_DIVISIONS`, `CP_2_WHATSAPP` di environment server. Tanpa konfigurasi lengkap dan valid, tombol CP sengaja disembunyikan. Fixture tes tidak dipakai sebagai data resmi.

Tidak menguji database Supabase, atomicity SQL RPC, nomor WhatsApp asli, atau deployment Vercel. Tidak menguji Safari/Firefox, perangkat HP fisik, keyboard virtual, atau screen reader nyata. Aset dekorasi opsional yang tidak disertakan dapat menghasilkan 404; tidak menimbulkan broken image terlihat atau exception aplikasi.

`npm test` menjalankan tes Node terisolasi. Pemasangan dan konfigurasi tersedia di README. Gunakan environment development untuk verifikasi API dengan data milikmu.
