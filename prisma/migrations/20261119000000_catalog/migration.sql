BEGIN;

CREATE TYPE "Category" AS ENUM ('TOPS', 'OUTER', 'PANTS');

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "category" "Category" NOT NULL,
  "length" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "condition" DOUBLE PRECISION NOT NULL,
  "flaws" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "soldOut" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Product" ("id", "name", "image", "category", "length", "width", "condition", "flaws", "price", "featured", "soldOut", "createdAt") VALUES
('sample-tee', 'Vintage Mountain Graphic Tee', '/images/tee.webp', 'TOPS', 70, 54, 8.5, 'Warna sedikit pudar merata.', 125000, true, false, '2026-01-01 00:00:06'),
('sample-bomber', 'Olive MA-1 Bomber Jacket', '/images/bomber.webp', 'OUTER', 68, 60, 9, 'Tidak ada minus berarti.', 285000, true, false, '2026-01-01 00:00:05'),
('sample-denim', 'Indigo Straight Leg Denim', '/images/denim.webp', 'PANTS', 102, 42, 8, 'Ada sedikit fraying di ujung kaki.', 175000, false, false, '2026-01-01 00:00:04'),
('sample-raglan', 'Burgundy Baseball Raglan', '/images/raglan.webp', 'TOPS', 67, 51, 9, 'Tidak ada minus berarti.', 145000, false, false, '2026-01-01 00:00:03'),
('sample-workwear', 'Khaki Double Knee Work Pants', '/images/workwear.webp', 'PANTS', 99, 40, 8.5, 'Bekas pakai tipis di bagian lutut.', 215000, true, false, '2026-01-01 00:00:02'),
('sample-coach', 'Washed Black Coach Jacket', '/images/coach.webp', 'OUTER', 71, 58, 8, 'Warna pudar di kerah.', 195000, false, true, '2026-01-01 00:00:01');

COMMIT;
