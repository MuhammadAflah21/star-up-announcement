# Gambar drop-in

Masukkan file pada path tabel, lalu refresh browser. PNG diprioritaskan. Jika PNG hilang/rusak/berukuran 1×1, loader mencoba `.webp` dengan nama dasar sama. Jika keduanya tidak tersedia, media disembunyikan tanpa debug, ikon rusak, atau emoji fallback. Gacha memakai orb CSS netral jika gambar belum tersedia; area gacha tetap berukuran sama.

| Penggunaan | Path PNG (WebP juga didukung) |
|---|---|
| Hasil diterima dan gacha | `assets/images/emoji-seneng.png` |
| Hasil belum diterima dan gacha | `assets/images/emoji-sedih.png` |
| Hasil NIM tidak ditemukan dan gacha | `assets/images/emoji-bingung.png` |
| Background | `assets/images/bawah-laut.png` |
| Aksen form | `assets/images/gelembung.png` |
| Ubur-ubur utama | `assets/jellyfish/jellyfish-hero.png` |
| Dekorasi kiri | `assets/jellyfish/jellyfish-left.png` |
| Dekorasi kanan | `assets/jellyfish/spombob-ramai.png` |
| Coral kiri (path kustom asli) | `assets/coral/jellyfish-hero.png` |
| Coral kanan (path kustom asli) | `assets/coral/spombob-ramai.png` |
| Bintang laut kiri | `assets/starfish/starfish-left.png` |
| Bintang laut kanan (path kustom asli) | `assets/starfish/gelembung.png` |
| Sparkle | `assets/sparkles/sparkle-cluster.png` |

Ketiga path gambar hasil di atas mengikuti registry ZIP terbaru dan dipakai bersama oleh kartu hasil serta animasi gacha. Tidak ada gambar asli yang dihapus, diubah nama, atau ditimpa.

Gambar asli saat ini berukuran 1200×1200 px dan tetap disertakan utuh. Jika mengganti artwork nanti, gunakan gambar transparan berkanvas persegi, dengan objek mengisi kanvas dan tanpa margin transparan sangat besar. Media hasil memakai `object-fit: contain`, ukuran responsif 80–104 px dengan overlap di tengah batas atas kartu. PNG/WebP tanpa transparansi tetap bisa dimuat, tetapi akan memperlihatkan background gambarnya. Background halaman memakai `cover`; dekorasi lain memakai `contain`.

Dekorasi tidak menangkap klik dan berada di belakang teks serta card. Mobile memakai dekorasi sisi atas/samping dan coral di bawah, dengan pembatas overflow pada layer dekorasi. Kotak abu-abu referensi tidak diimplementasikan sebagai desain.

ZIP sumber menyertakan tiga PNG ilustrasi hasil, empat font Poppins, dan lisensi. Semua file tersebut dipertahankan byte-identik. Tidak ditambahkan karakter emoji Unicode, ilustrasi generatif, gambar internet, atau fixture pengujian ke source final. Saat aset belum ada, request PNG/WebP dapat menghasilkan 404 di Network/console browser; loader menanganinya tanpa exception JavaScript atau broken image terlihat.

Jika menyalin revisi ke proyek yang sudah berisi artwork, pertahankan folder assets milikmu. Nama file case-sensitive pada hosting Linux. Setelah mengganti PNG/WebP, lakukan Ctrl+F5 agar tidak melihat cache lama.
