import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { categoryLabels, priceLabel } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { createProduct, deleteProduct, logout, markSoldOut } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin — met’tiers.idn", robots: { index: false, follow: false } };

const messages: Record<string, string> = {
  invalid: "Periksa kembali ukuran, kondisi, harga, kategori, dan URL foto.",
  ditambah: "Produk berhasil ditambahkan.",
  dihapus: "Produk berhasil dihapus.",
  "sold-out": "Produk ditandai Sold Out.",
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  const authorized = await isAdmin();
  const products = authorized ? await prisma.product.findMany({ orderBy: { createdAt: "desc" } }) : [];
  const message = typeof pesan === "string" && Object.hasOwn(messages, pesan) ? messages[pesan] : "";

  return <>
    <header className="site-header wrap">
      <Link className="wordmark" href="/">met’tiers<span>.idn</span></Link>
      <nav><Link href="/">← Katalog</Link>{authorized && <form action={logout}><button className="plain-button">Keluar</button></form>}</nav>
    </header>
    <main className="wrap admin">
      <h1>{authorized ? "Kelola Produk" : "Masuk Admin"}</h1>
      {!authorized ? <LoginForm /> : <>
        {message && <p className="admin-message" role="status">{message}</p>}
        <form action={createProduct} className="admin-panel">
          <h2>Tambah Produk</h2>
          <div className="admin-fields">
            <label>Nama barang<input name="name" required maxLength={120} /></label>
            <label>URL foto (HTTPS)<input name="image" type="url" required maxLength={2048} placeholder="https://…" /></label>
            <div className="admin-field"><label htmlFor="product-category">Kategori</label><select id="product-category" name="category">{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
            <label>Harga (Rp)<input name="price" type="number" min="1" max="2147483647" required /></label>
            <label>Panjang (cm)<input name="length" type="number" min="1" max="500" required /></label>
            <label>Lebar (cm)<input name="width" type="number" min="1" max="500" required /></label>
            <label>Skor kondisi (0–10)<input name="condition" type="number" min="0" max="10" step="0.1" required /></label>
            <label>Keterangan minus<input name="flaws" maxLength={500} /></label>
          </div>
          <label className="checkbox"><input type="checkbox" name="featured" /> Masukkan ke Koleksi Pilihan</label>
          <button className="admin-button">Tambah Produk</button>
        </form>
        <section className="admin-panel">
          <h2>Daftar Produk ({products.length})</h2>
          {!products.length && <p>Belum ada produk.</p>}
          {products.map((product) => <div className="admin-row" key={product.id}>
            <div><strong>{product.name}</strong><p>{priceLabel(product.price)} · {product.soldOut ? "Sold Out" : "Tersedia"}</p></div>
            <div className="row-actions">
              {!product.soldOut && <form action={markSoldOut}><input type="hidden" name="id" value={product.id} /><button className="admin-button">Tandai Sold Out</button></form>}
              <form action={deleteProduct}><input type="hidden" name="id" value={product.id} /><button className="admin-button delete">Hapus</button></form>
            </div>
          </div>)}
        </section>
      </>}
    </main>
  </>;
}
