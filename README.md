# met’tiers.idn

Katalog thrift berbasis Next.js App Router, TypeScript, Tailwind CSS, Prisma, dan PostgreSQL.

## Pengembangan lokal

1. Gunakan Node.js 22 atau 24 dan siapkan database PostgreSQL.
2. Jalankan `npm ci`.
3. Salin `.env.example` ke `.env`, lalu isi `DATABASE_URL` dengan URL koneksi PostgreSQL.
4. Jalankan `npm run db:deploy`. Migrasi pertama membuat tabel dan mengisi enam produk contoh satu kali. Produk yang dihapus melalui admin tidak muncul kembali saat migrasi dijalankan ulang.
5. Jalankan `npm run dev` dan buka `http://localhost:3000`.

Buka `/admin` untuk menambah produk dengan URL foto HTTPS, menandai barang Sold Out, atau menghapus barang. Jika `ADMIN_PASSWORD` kosong, password default adalah `mettiers2026`. Gunakan password unik pada deployment publik.

## Deploy ke Vercel

1. Impor repositori dengan framework Next.js dan pilih Node.js 22 atau 24.
2. Atur `DATABASE_URL` dan `ADMIN_PASSWORD` di Environment Variables. Gunakan URL PostgreSQL yang bisa dijangkau dari Vercel dan mendukung migrasi Prisma (biasanya URL langsung dari penyedia database).
3. Gunakan database terpisah untuk Preview jika Preview dan Production sama-sama melakukan build. Konfigurasi `vercel.json` menjalankan `npm run vercel-build`, yang menerapkan migrasi, menghasilkan Prisma Client, dan membuat build Next.js.

Untuk memeriksa produksi secara lokal, jalankan `npm run build` lalu `npm start`.
