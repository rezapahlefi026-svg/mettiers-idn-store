# met’tiers.idn

Katalog thrift dengan antarmuka dari referensi `mettiers-kode-sumber.md`, disajikan melalui Next.js App Router. Prisma menyimpan data produk, foto, dan tenggat booking di PostgreSQL.

## Pengembangan lokal

1. Gunakan Node.js 22 atau 24 dan siapkan database PostgreSQL.
2. Jalankan `npm ci`.
3. Salin `.env.example` ke `.env`, lalu isi `DATABASE_URL` dan `ADMIN_PASSWORD`. Gunakan password yang kuat dan unik.
4. Jalankan `npm run db:deploy`, lalu `npm run dev`. Buka `http://localhost:3000`.

Buka panel lewat tombol **Admin** di footer atau melalui `/admin`. Atur durasi 1, 3, 6, 12, 24, atau 48 jam untuk status Booking. Setelah tenggat, produk kembali tersedia saat katalog diperbarui. Tandai Sold Out setelah pembayaran dikonfirmasi. Lima sudut foto didukung dengan batas 1 MB per foto. Browser mencoba memperkecil unggahan bila melebihi batas per foto atau batas total request Vercel.

Migrasi memasukkan enam produk contoh dari referensi. Pada database lama, migrasi mengganti contoh bawaan yang masih sama persis dengan data awal dan mempertahankan produk yang ditambahkan atau diubah. Produk lama bertanda Pilihan dipetakan ke kategori Koleksi Pilihan. Gambar referensi tidak tercantum dalam lampiran, sehingga katalog menggunakan ilustrasi pengganti.

## Deploy ke Vercel

Impor repositori sebagai proyek Next.js. Isi `DATABASE_URL` dan `ADMIN_PASSWORD` di Environment Variables. Gunakan URL koneksi PostgreSQL yang dapat menjalankan migrasi dan dijangkau dari Vercel. Gunakan database terpisah untuk Preview. Build yang ditetapkan di `vercel.json` menerapkan migrasi, menghasilkan Prisma Client, dan membangun aplikasi.
