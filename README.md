# STAR UP Announcement — Final Frontend Polish

Revisi 24 Oktober 2026: landing mobile, tiga kartu hasil sesuai referensi, dan gacha emoji selama pemeriksaan NIM. Tetap HTML/CSS/Vanilla JavaScript; backend belum dihubungkan.

## Memasang ke proyek yang sudah ada

1. Ekstrak ZIP ke folder terpisah dan backup file proyekmu.
2. Ganti hanya enam file berikut dengan versi dari ZIP ini:
   - `index.html`
   - `css/style.css`
   - `css/responsive.css`
   - `css/animation.css`
   - `js/main.js`
   - `js/animation.js`
3. **Pertahankan folder `assets` lokalmu. Tidak perlu menyalin atau menimpanya.**
4. Jalankan `index.html` menggunakan Live Server di VS Code, lalu Ctrl+F5. File juga dapat dibuka langsung di browser.

Tidak perlu npm/build. `package.json` kosong dan scaffold API/data kosong dari ZIP awal tetap dipertahankan, tidak digunakan oleh frontend ini.

## Perilaku saat ini

NIM harus tepat **8 karakter**, gabungan huruf A–Z dan angka 0–9, tanpa spasi/simbol. Huruf kecil otomatis menjadi kapital, misalnya `h1d25001` → `H1D25001`. Input tidak dipotong dan leading zero tetap dipertahankan.

Adapter `checkNim()` belum terhubung, sehingga setelah format valid UI menampilkan **layanan belum tersedia**. Tidak ada hasil acak, peserta hardcode, atau menu DEMO. Gacha hanya visual; hasil akhirnya mengikuti respons adapter.

Tiga hasil yang disiapkan: 🤩 diterima, 😥 belum diterima, 🤔 NIM tidak ditemukan. “Cek NIM lainnya” membersihkan hasil dan input; tombol coba lagi pada gangguan layanan mempertahankan NIM.

## Dokumentasi

- [Laporan revisi, mekanisme gacha, 79 pemeriksaan browser, dan batasan](docs/AUDIT-TESTING.md)
- [Titik integrasi dan kontrak backend](docs/BACKEND.md)

Seluruh file/path assets dari ZIP terbaru dipertahankan. ZIP sumber kali ini hanya menyertakan font, **tanpa PNG ilustrasi**; karena itu gambar yang tidak disertakan dapat menghasilkan request 404 yang ditangani loader. Dokumen `docs/ASSETS.md` berasal dari revisi sebelumnya; jangan mengganti path kustom di `ASSET_REGISTRY` hanya untuk mengikuti tabel lama tersebut. Revisi ini tidak mengembangkan sistem assets.

Bentuk emoji bergantung pada OS/browser. Reduced motion menggunakan emoji statis. Sebelum backend produksi, cocokkan kembali aturan NIM 8 karakter dengan data asli panitia.
