import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "met’tiers.idn — Katalog Thrift",
  description: "Katalog thrift streetwear dan vintage pilihan. Satu barang, satu stok.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
