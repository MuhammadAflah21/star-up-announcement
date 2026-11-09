# Kontrak backend dan rate limiting

## Alur yang dipertahankan

`form → normalizeNim/validateNim → checkNim → POST /api/cek-nim → checkRateLimit → Supabase peserta → resolveContactPerson → validateResponse → renderResult → setState`.

Frontend dan backend memakai NIM tepat **9 karakter**: ASCII A–Z dan 0–9, minimal satu huruf dan angka. Huruf kecil ASCII dinormalisasi menjadi uppercase, simbol/spasi tidak dihapus diam-diam. NIM tetap string, termasuk leading zero. Backend menolak input nonstring. Frontend dan backend juga menolak huruf Unicode yang bisa berubah menjadi huruf ASCII lewat uppercase umum.

| HTTP | Status | UI |
|---|---|---|
| 200 | accepted | Gambar accepted overlap, selamat, nama, reset kiri dan Contact Person kanan; tanpa divisi |
| 200 | not-accepted | Gambar not-accepted, pesan suportif, reset |
| 200 | not-found | Gambar not-found, NIM tidak ditemukan, reset |
| 429 | rate-limited | Label batas percobaan, judul terlalu banyak percobaan, estimasi waktu dari Retry-After |
| 503 | service-unavailable | Layanan belum aktif/tersedia |
| 400/405/415/500, jaringan gagal, timeout, respons rusak | error | Pesan gagal dan tombol mencoba lagi |

HTTP 429 diproses sebelum decoding JSON agar tetap benar untuk response proxy berupa HTML. Header Retry-After mendukung detik integer atau HTTP-date. Menit dibulatkan ke atas; header tidak valid menghasilkan pesan tunggu umum tanpa angka statis. Tidak ada cooldown lokal permanen: setelah masa server berakhir pengguna bisa submit lagi. Server tetap otoritas pembatasan, termasuk bila pengguna kembali ke form lebih awal.

Accepted memerlukan `status`, `nim`, `name`, `division` (kontrak data; tidak dirender pada kartu), dan opsional `coordinator: { name, whatsapp }` atau null. Not-accepted memerlukan `status`, `nim`, dan `name`; UI tidak menampilkan nama/divisi/kontak pada kondisi ini. Not-found hanya memerlukan `status`. Semua data UI memakai `textContent` dan NIM respons harus cocok dengan permintaan.

WhatsApp harus string 8–15 digit, digit pertama 1–9, `+` opsional. Ini pemeriksaan format, bukan verifikasi akun aktif. URL dibentuk sebagai `https://wa.me/` ditambah digit tervalidasi. Nilai null/kosong/salah tidak menampilkan tombol. Tidak ada nomor hardcode pada runtime browser.

## Environment server

- `SUPABASE_URL`: URL proyek Supabase development yang sudah ada.
- `SUPABASE_SECRET_KEY`: secret server untuk proyek tersebut; tidak dikirim ke browser.
- `ANNOUNCEMENT_OPEN`: tepat `true` untuk mengaktifkan pengecekan pada environment yang dituju; default contoh `false`.
- `RATE_LIMIT_SECRET`: secret HMAC minimal 32 karakter. Jangan menggantinya untuk menguji reset, karena pergantian key akan membuat identitas hash berbeda.

Dependency tetap `@supabase/supabase-js` dari sumber, terkunci pada 2.118.0 melalui package-lock. Node minimal 22 sesuai engine dependency. Client server tidak menyimpan sesi auth. Semua respons endpoint `Cache-Control: no-store`.

## Audit rate limiter

`lib/rate-limit.mjs` memanggil RPC `consume_announcement_rate_limit` tepat sekali sebelum query peserta. Argumen hanya `p_key_hash`: HMAC-SHA256 atas prefix dan IP, bukan IP mentah.

Vercel preview/production memakai `x-vercel-forwarded-for`, fallback `x-real-ip`; development memakai socket remoteAddress sehingga header forwarding buatan klien lokal tidak mengganti identitas. Implementasi ini ditujukan untuk Vercel secara langsung; topologi reverse proxy lain perlu diverifikasi tersendiri.

RPC harus mengembalikan tepat satu baris/object dengan boolean `allowed`. Saat diblokir, `retry_after_seconds` harus positif dan terbatas; nilai pecahan dibulatkan ke atas untuk header. RPC error, secret/IP hilang, respons ambigu, atau retry tidak valid menghasilkan 503 tanpa query peserta. Tidak ada fallback in-memory yang melewati perlindungan.

**Batas 5 permintaan/600 detik berada di fungsi PostgreSQL yang sudah ada.** ZIP sumber tidak menyertakan definisi SQL/tabel limiter. Revisi tidak mengganti atau membuat ulang fungsi/tabel tersebut. Tes memakai mock penghitung 5/600 untuk memeriksa perilaku handler dan kontrak RPC; itu bukan bukti atomicity database nyata.

Untuk audit read-only di SQL Editor Supabase, jalankan:

```sql
SELECT n.nspname AS schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'consume_announcement_rate_limit';
```

Periksa batas 5/600, update penghitung atomik (bukan read/update terpisah tanpa lock), reset saat window berakhir, perhitungan retry, izin pemanggilan hanya role server, dan penyimpanan hash saja. Uji lima request berhasil, keenam 429, kemudian berhasil lagi setelah window kedaluwarsa pada development. Tidak ada operasi SQL yang dijalankan otomatis oleh proyek ini.

## Pemetaan dua Contact Person

`lib/contact-person.mjs` membaca empat environment variable server: `CP_1_DIVISIONS`, `CP_1_WHATSAPP`, `CP_2_DIVISIONS`, dan `CP_2_WHATSAPP`. Semua kosong dalam `.env.example`; tidak ada fallback kontak.

CP pertama harus memiliki tepat 5 nama divisi unik, CP kedua tepat 6 nama unik. Daftar dipisahkan koma; kapital dan spasi berulang dinormalisasi. Kedua kelompok tidak boleh tumpang tindih dan nomor keduanya harus berbeda serta valid. Nilai divisi peserta dicocokkan dengan daftar ini. Hasilnya `{ name: 'Contact Person', whatsapp }` atau `null`, dikirim melalui properti `coordinator` yang sudah digunakan frontend.

Konfigurasi belum lengkap/salah atau divisi tidak cocok menghasilkan `coordinator: null`. Hasil accepted tetap ditampilkan, tombol kontak disembunyikan. Tidak ada query kontak ke tabel `koordinator`; tabel tersebut tidak dihapus. Perubahan environment memerlukan restart proses development atau penerapan ulang environment hosting.

Daftar divisi asli dan dua nomor asli belum diberikan. Isi konfigurasi sebelum menggunakan tombol CP secara resmi. Nomor dan label pada tes hanyalah fixture terisolasi, bukan konfigurasi production.

## Data peserta

Data peserta tetap pada Supabase yang sudah digunakan proyek: `nim`, `nama`, `status`, `divisi`. Tidak ada data peserta publik atau data simulasi dalam frontend. Gunakan environment development untuk pengujian data dummy; tidak ada SQL yang dijalankan otomatis oleh revisi ini.

## Referensi teknis yang diperiksa

- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Supabase JavaScript RPC](https://supabase.com/docs/reference/javascript/rpc)
- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

Tidak ada deployment production atau aktivasi pengumuman publik yang dilakukan.
