import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { connection } from "next/server";
import { categoryLabels, priceLabel } from "@/lib/catalog";
import { prisma } from "@/lib/db";

const filters = [
  ["", "Semua"], ["TOPS", "Kaos & Atasan"], ["OUTER", "Jaket & Outer"],
  ["PANTS", "Celana"], ["featured", "Koleksi Pilihan"],
] as const;

export default async function Home({ searchParams }: {
  searchParams: Promise<{ kategori?: string; urut?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const category = filters.find(([key]) => key === params.kategori)?.[0] ?? "";
  const sort = params.urut === "termurah" || params.urut === "termahal" ? params.urut : "";
  const where: Prisma.ProductWhereInput = category === "featured" ? { featured: true } : category ? { category } : {};
  const products = await prisma.product.findMany({
    where,
    orderBy: sort ? [{ price: sort === "termurah" ? "asc" : "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
  });

  return (
    <>
      <div className="announcement">THRIFT STORE <span>✦</span> STREETWEAR & VINTAGE <span>✦</span> INDONESIA</div>
      <header className="site-header wrap">
        <Link href="/" className="wordmark">met’tiers<span>.idn</span></Link>
        <nav aria-label="Navigasi utama">
          <a className="nav-active" href="#katalog">Katalog</a>
          <a href="https://www.instagram.com/mettiers.idn/" target="_blank" rel="noreferrer">Instagram <span aria-hidden="true">→</span></a>
        </nav>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner wrap">
            <div className="hero-content">
              <div className="hero-label"><span /> KATALOG THRIFT</div>
              <h1 id="hero-title">Streetwear<br /><em>pilihan.</em></h1>
              <p>Streetwear dan vintage preloved yang dikurasi satu per satu. Setiap barang hanya punya satu stok.</p>
              <a href="#katalog" className="hero-button">Lihat Katalog <span aria-hidden="true">↓</span></a>
            </div>
          </div>
        </section>
        <section className="catalog wrap" id="katalog" aria-labelledby="catalog-title">
          <div className="catalog-heading">
            <div>
              <div className="eyebrow"><span>✦</span> BELANJA THRIFT</div>
              <h2 id="catalog-title">Katalog Produk</h2>
            </div>
            <p className="catalog-count">{products.length} PRODUK</p>
          </div>
          <div className="catalog-tools">
            <nav className="filters" aria-label="Kategori produk">
              {filters.map(([key, label]) => {
                const query = new URLSearchParams();
                if (key) query.set("kategori", key);
                if (sort) query.set("urut", sort);
                return <Link key={key} href={`/${query.size ? `?${query}` : ""}#katalog`} aria-current={key === category ? "true" : undefined} className={key === category ? "selected" : ""}>{key === "featured" && "✦ "}{label}</Link>;
              })}
            </nav>
            <form action="/#katalog" className="sort">
              {category && <input type="hidden" name="kategori" value={category} />}
              <select name="urut" aria-label="Urutkan produk" defaultValue={sort}>
                <option value="">Terbaru</option><option value="termurah">Termurah</option><option value="termahal">Termahal</option>
              </select>
              <button type="submit" aria-label="Terapkan urutan">→</button>
            </form>
          </div>
          {products.length === 0 && <p className="empty">Belum ada produk di kategori ini.</p>}
          <div className="product-grid">
            {products.map((product) => {
              const message = `Halo met’tiers.idn! Saya mau pesan ${product.name} (${priceLabel(product.price)}). Apakah masih tersedia?`;
              return <article className="product-card" key={product.id}>
                <div className="product-photo">
                  {/* Product photos may come from URLs entered by the store admin. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={product.name} loading="lazy" />
                  <span className={`stock ${product.soldOut ? "sold" : ""}`}><i />{product.soldOut ? "Sold Out" : "Hanya 1 Stok"}</span>
                </div>
                <div className="product-info">
                  <div className="product-category">{categoryLabels[product.category]}{product.featured && " · ✦ Pilihan"}</div>
                  <h3>{product.name}</h3>
                  <div className="product-details"><span>P × L <strong>{product.length} × {product.width} cm</strong></span><span>Kondisi <strong>{product.condition}/10</strong></span></div>
                  <p className="flaws">Minus: {product.flaws}</p>
                  <p className="price">{priceLabel(product.price)}</p>
                  {product.soldOut ? <span className="order disabled">Sold Out</span> :
                    <a className="order" target="_blank" rel="noreferrer" href={`https://wa.me/6289518164532?text=${encodeURIComponent(message)}`}>Pesan via WhatsApp <span aria-hidden="true">→</span></a>}
                </div>
              </article>;
            })}
          </div>
        </section>
      </main>
      <footer><div className="wrap footer-inner">
        <Link href="/" className="wordmark">met’tiers<span>.idn</span></Link>
        <Link href="/admin">Admin <span aria-hidden="true">→</span></Link>
      </div></footer>
    </>
  );
}
