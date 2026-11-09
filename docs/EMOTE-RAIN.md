# Perbaikan terbatas — Emote Rain

## Penyebab error

Dalam ZIP awal, `effectsLayer` dan `clearResultEffects()` berada di dalam IIFE `main.js`, tetapi `playResultEffects()` berada di luar IIFE. Fungsi global tersebut tidak dapat mengakses keduanya. `renderResult()` memanggilnya untuk accepted/not-accepted sebelum menulis nama/headline/CP; `ReferenceError: effectsLayer is not defined` kemudian ditangkap oleh catch pencarian dan dialihkan ke halaman error, meskipun API mengirim HTTP200. Selain itu, elemen `#result-effects` belum ada di HTML.

Perbaikan memisahkan controller efek ke `js/result-effects.js`, menambahkan layer dekoratif, dan memanggil efek setelah `setState(result.status)` berhasil. Pemanggilan efek memiliki penanganan exception/rejection sendiri. Kegagalan efek dicatat sebagai `[STAR UP emote rain]`; kegagalan request/validasi/render utama dicatat sebagai `[STAR UP pencarian]`. Efek tidak menentukan hasil seleksi.

Endpoint, query Supabase peserta/koordinator, format respons, pemetaan CP, rate limiter, validasi NIM 9 karakter, dan gacha existing tidak diubah.

## Delapan file PNG

Masukkan file ke `assets/images/effects/`:

- Accepted: `happy-1.png` sampai `happy-4.png`.
- Not-accepted: `sad-1.png` sampai `sad-4.png`.

Gunakan PNG persegi transparan, ringan, misalnya 128–256 px. Delapan gambar belum disertakan karena akan dibuat pengguna. Tidak ada emoji Unicode, ilustrasi baru, atau penggunaan ulang gambar utama sebagai pengganti.

Reload setelah memasukkan gambar. Ketersediaan setiap gambar dicache per halaman, termasuk yang hilang, agar tidak mengulang request 404 setiap pencarian. Hanya kelompok status yang diperlukan dimuat; preload dibatasi 3 detik. Sebagian aset tersedia tetap dapat dipakai. Jika semuanya hilang, efek dilewati. Request pertama untuk file yang belum ada dapat terlihat sebagai 404 di Network; tidak ada broken image di halaman.

Efek sementara memakai 12 partikel pada mobile/18 desktop, jatuh 3,8–5,4 detik dengan delay hingga 0,8 detik. Semua gambar yang tersedia digunakan bergantian dalam urutan acak. Layer fixed di belakang UI, pointer-events none dan aria-hidden, sehingga tidak mengubah layout, menutup nama, atau menangkap klik. Partikel dibersihkan setelah selesai, saat reset, perpindahan ke form/pencarian baru, pagehide, tab disembunyikan, dan perubahan ke reduced motion. Tidak berjalan pada not-found, checking, landing, 429, 503, atau error.

## Menjalankan hasil

1. Ekstrak ZIP ke folder baru, atau salin file proyek ke proyek lama sambil mempertahankan konfigurasi lokal dan aset milikmu. File konfigurasi rahasia tidak disertakan.
2. Buka folder yang berisi `package.json` di VS Code. Gunakan Node >=22, jalankan `npm ci`.
3. Pertahankan konfigurasi server yang sudah berfungsi. **ZIP sumber memiliki `.env.loval` (typo), bukan `.env.local`.** Jika itu file konfigurasi lokalmu, simpan salinannya sebagai `.env.local` di sebelah `package.json`, dengan nilai yang sama. Jangan memasukkan secret ke HTML/JS atau Git. Paket hasil tidak menyertakan file typo berisi konfigurasi pribadi tersebut.
4. Pastikan `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SECRET` dari environment yang benar tersedia. Jangan mengganti secret rate limit yang sudah berfungsi. Untuk pengecekan yang memang ingin dibuka, `ANNOUNCEMENT_OPEN=true` ditulis di file environment, bukan sebagai perintah PowerShell.
5. Jalankan `npx vercel dev`; buka URL localhost dari terminal. Setelah mengubah environment, restart server. Live Server tidak menjalankan Vercel Functions.
6. Masukkan NIM peserta dari database development milikmu; jangan mengasumsikan NIM fixture tes ada di database. `npm test` hanya memakai mock terisolasi.

**CP pada source ini berasal dari Supabase tabel `koordinator`, bukan variabel CP_1/CP_2.** Backend mencari baris berdasarkan `peserta.divisi` dan membaca `nama, whatsapp`. Pertahankan pemetaan 11 divisi ke dua CP yang sudah ada. File helper environment dan dokumentasi lama tetap disertakan tanpa perubahan karena di luar scope; panduan terbaru ini menjelaskan alur endpoint aktual.

## Jika pengecekan bermasalah

Buka DevTools → Network → POST `/api/cek-nim` → HTTP status dan Response:

- 200 accepted/not-accepted/not-found: backend mengembalikan hasil; periksa Console jika UI gagal.
- accepted dengan coordinator null: CP tidak ditemukan oleh query existing; periksa kecocokan divisi di database, bukan efek.
- 429: batas percobaan, ikuti Retry-After. Tidak ada emote rain.
- 503: pengumuman ditutup, environment belum terbaca, atau RPC rate limit tidak tersedia; lihat log terminal.
- 500: lihat log server `Kesalahan query Supabase`; jangan menyamakan dengan NIM tidak ditemukan.
- Request tidak muncul: periksa pesan validasi input dan Console.

Cocokkan Supabase project dari environment server dengan tempat memasukkan peserta. Data baru dibaca oleh request berikutnya. Konfigurasi localhost dan hosting terpisah. Jangan membagikan secret saat meminta bantuan.

Laporan pengujian revisi ini ada di `docs/EMOTE-RAIN-TESTING.md`. Laporan lama tidak mewakili pengujian revisi ini.
