# STAR UP Announcement — REFERENCE FIX

Revisi 25 Oktober 2026. Frontend Vanilla JS, API Vercel `POST /api/cek-nim`, dan Supabase yang sudah ada tetap digunakan. Validasi NIM **9 karakter ASCII alfanumerik**, minimal satu huruf dan satu angka. Tidak ada hasil acak atau daftar peserta di frontend.

## Menjalankan lokal

1. Ekstrak ZIP ke folder baru. Jika menyalin ke proyek lama, backup dahulu dan pertahankan gambar milikmu. Hapus `js/result-layout.js` lama; script tersebut sudah tidak digunakan.
2. Gunakan Node.js 22 atau lebih baru (sesuai dependency Supabase dalam lockfile).
3. Buka terminal di folder yang berisi `package.json`, jalankan `npm ci`.
4. Salin `.env.example` menjadi `.env.local`, isi `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, dan `RATE_LIMIT_SECRET` milik environment development. Secret rate limit minimal 32 karakter; pertahankan secret yang sudah digunakan jika konfigurasi lama benar.
5. Default `ANNOUNCEMENT_OPEN=false`. Untuk menguji data dummy di environment development saja, ubah menjadi `true` pada `.env.local`.
6. Jalankan `npx vercel dev`, pilih/link proyek development yang sesuai bila diminta CLI. Buka URL lokal yang diberikan CLI, kemudian Ctrl+F5. Ini tidak menjalankan deployment production.

Live Server atau `file://` hanya menampilkan frontend; keduanya **tidak menjalankan API Vercel**. Gunakan Vercel Development untuk menguji hasil melalui Supabase. Jangan menaruh secret di HTML, JavaScript browser, URL, atau folder assets.

## Hasil revisi dan fitur yang dipertahankan

- Kartu accepted mengikuti referensi: gambar overlap di tengah atas, “SELAMAT KAMU LOLOS!”, nama peserta, lalu Cek NIM lainnya di kiri dan Contact Person di kanan dalam satu baris, termasuk pada 320 px. Tidak menampilkan nama divisi.
- Tombol Buka hasil dan Cek NIM lainnya menggunakan gradient biru yang sama. Kartu not-accepted/not-found memakai tombol reset selebar area konten.
- State rate limit terpisah: HTTP 429 menampilkan batas percobaan dan estimasi menit dari `Retry-After`. Header tidak tersedia tidak diganti angka rekaan.
- HTTP 503 → layanan belum tersedia; error lain → kartu error. Respons rusak/identitas tidak cocok tidak menjadi hasil seleksi.
- Proporsi mobile yang sudah diperbesar pada source terbaru dipertahankan; CSS gambar hasil/gacha yang sempat kembali ke versi lama diperbaiki. Bentuk judul, background, dan animasinya tetap.
- Ilustrasi memakai tiga PNG asli yang sudah kamu tambahkan; tidak ada emoji Unicode atau placeholder debug. Gacha memakai tiga gambar hasil atau orb CSS netral saat gambar hilang.
- Pencarian dibatasi 12 detik, double-submit dicegah, timer dibersihkan, dan reduced motion didukung. Tombol utama tetap memakai gradient biru saat hover.
- Integrasi Supabase dan RPC rate limiting dipertahankan. Respons RPC rusak gagal tertutup: pencarian peserta tidak diteruskan.

## Memasukkan gambar

Masukkan file di path berikut, kemudian refresh:

- `assets/images/emoji-seneng.png`
- `assets/images/emoji-sedih.png`
- `assets/images/emoji-bingung.png`

Bisa memakai `.webp` dengan nama dasar yang sama. PNG diprioritaskan jika keduanya ada. Gambar yang hilang/rusak tidak menghasilkan ikon broken image atau kotak debug. Path dekorasi kustom lama tetap tersedia; daftar lengkap ada di [docs/ASSETS.md](docs/ASSETS.md).

ZIP terbaru sudah memuat tiga gambar hasil (emoji-seneng, emoji-sedih, emoji-bingung). Ketiganya disertakan utuh tanpa perubahan byte atau nama. Tidak ada ilustrasi baru yang dibuat; dekorasi lain yang belum tersedia tetap opsional.

## Dua Contact Person untuk 11 divisi

Konfigurasi sengaja **kosong**, sesuai pilihan pengguna. Isi empat variabel server pada `.env.local` (atau environment hosting):

- `CP_1_DIVISIONS`: tepat 5 nama divisi, dipisahkan koma.
- `CP_1_WHATSAPP`: nomor internasional CP pertama.
- `CP_2_DIVISIONS`: tepat 6 nama divisi lainnya, dipisahkan koma.
- `CP_2_WHATSAPP`: nomor internasional CP kedua yang berbeda.

Nama divisi harus sesuai `peserta.divisi`; perbedaan kapital dan spasi berulang dinormalisasi. Tidak boleh ada divisi ganda atau tumpang tindih. Nomor berupa teks 8–15 digit, tanpa spasi/tanda hubung, diawali kode negara (`+` opsional). Tidak ada nama divisi atau nomor kontak rekaan pada konfigurasi.

Jika konfigurasi belum lengkap/valid, atau divisi tidak termasuk pemetaan, tombol CP disembunyikan; hasil seleksi tetap ditampilkan. Setelah konfigurasi benar, peserta accepted diarahkan ke salah satu dari dua CP. Nama divisi tidak ditampilkan pada kartu. API tidak lagi mencari kontak per divisi dari tabel `koordinator`; tabel/database yang sudah ada tidak dihapus atau diubah.

Daftar peserta tetap pada tabel `peserta`. Detail kontrak ada di [docs/BACKEND.md](docs/BACKEND.md).

## Pengujian

Jalankan `npm test` untuk tes API/rate limiter terisolasi. Tes mengintersep HTTP SDK Supabase dan tidak menghubungi database atau memakai secret asli. Nama `TEST00001`, `TEST00002`, dan `TEST00003` hanya fixture pengujian.

Hasil pengujian browser, audit, daftar file, dan keterbatasan lengkap ada di [docs/AUDIT-TESTING.md](docs/AUDIT-TESTING.md). Validasi database nyata, fungsi SQL atomik, dan deployment Vercel masih harus dilakukan di environment development milikmu sebelum publikasi.
