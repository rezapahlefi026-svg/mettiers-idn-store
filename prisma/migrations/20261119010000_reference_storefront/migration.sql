BEGIN;

-- Replace only the original bundled sample rows. Keep existing store data and modified samples.
DELETE FROM "Product" AS product
USING (VALUES
('sample-tee', 'Vintage Mountain Graphic Tee', '/images/tee.webp', 'TOPS', 70, 54, 8.5, 'Warna sedikit pudar merata.', 125000, true, false, '2026-01-01 00:00:06'),
('sample-bomber', 'Olive MA-1 Bomber Jacket', '/images/bomber.webp', 'OUTER', 68, 60, 9, 'Tidak ada minus berarti.', 285000, true, false, '2026-01-01 00:00:05'),
('sample-denim', 'Indigo Straight Leg Denim', '/images/denim.webp', 'PANTS', 102, 42, 8, 'Ada sedikit fraying di ujung kaki.', 175000, false, false, '2026-01-01 00:00:04'),
('sample-raglan', 'Burgundy Baseball Raglan', '/images/raglan.webp', 'TOPS', 67, 51, 9, 'Tidak ada minus berarti.', 145000, false, false, '2026-01-01 00:00:03'),
('sample-workwear', 'Khaki Double Knee Work Pants', '/images/workwear.webp', 'PANTS', 99, 40, 8.5, 'Bekas pakai tipis di bagian lutut.', 215000, true, false, '2026-01-01 00:00:02'),
('sample-coach', 'Washed Black Coach Jacket', '/images/coach.webp', 'OUTER', 71, 58, 8, 'Warna pudar di kerah.', 195000, false, true, '2026-01-01 00:00:01')
) AS sample(id, name, image, category, length, width, condition, flaws, price, featured, sold_out, created_at)
WHERE product."id" = sample.id
  AND ROW(product."name", product."image", product."category"::text, product."length", product."width",
    product."condition", product."flaws", product."price", product."featured", product."soldOut", product."createdAt")
  IS NOT DISTINCT FROM ROW(sample.name, sample.image, sample.category, sample.length, sample.width,
    sample.condition::double precision, sample.flaws, sample.price, sample.featured, sample.sold_out, sample.created_at::timestamp);

CREATE TYPE "StockStatus" AS ENUM ('available', 'booking', 'sold');
CREATE TYPE "PhotoSlot" AS ENUM ('front', 'back', 'side', 'tryon', 'detail');

ALTER TABLE "Product" ADD COLUMN "size" TEXT,
  ADD COLUMN "status" "StockStatus" NOT NULL DEFAULT 'available',
  ADD COLUMN "bookingUntil" TIMESTAMP(3),
  ADD COLUMN "illustration" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Product" SET "size" = 'P ' || "length" || ' cm × L ' || "width" || ' cm',
  "status" = (CASE WHEN "soldOut" THEN 'sold' ELSE 'available' END)::"StockStatus";
ALTER TABLE "Product"
  ALTER COLUMN "size" SET NOT NULL,
  ALTER COLUMN "category" TYPE INTEGER USING CASE
    WHEN "featured" THEN 4 WHEN "category" = 'TOPS' THEN 1 WHEN "category" = 'OUTER' THEN 2 ELSE 3 END,
  ALTER COLUMN "condition" TYPE TEXT USING "condition"::text || '/10',
  ADD CONSTRAINT "Product_category_check" CHECK ("category" BETWEEN 1 AND 4),
  ADD CONSTRAINT "Product_booking_check" CHECK (("status" = 'booking') = ("bookingUntil" IS NOT NULL)),
  DROP COLUMN "length", DROP COLUMN "width", DROP COLUMN "featured", DROP COLUMN "soldOut";
DROP TYPE "Category";
ALTER TABLE "Product" RENAME COLUMN "image" TO "photo";
ALTER TABLE "Product" RENAME COLUMN "price" TO "value";
ALTER TABLE "Product" RENAME COLUMN "flaws" TO "flaw";

CREATE TABLE "ProductPhoto" (
  "productId" TEXT NOT NULL,
  "slot" "PhotoSlot" NOT NULL,
  "photo" BYTEA NOT NULL,
  "mime" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  CONSTRAINT "ProductPhoto_pkey" PRIMARY KEY ("productId", "slot"),
  CONSTRAINT "ProductPhoto_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "LoginAttempt" (
  "client" TEXT NOT NULL,
  "window" INTEGER NOT NULL,
  "attempts" INTEGER NOT NULL,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("client")
);
CREATE INDEX "LoginAttempt_window_idx" ON "LoginAttempt"("window");

INSERT INTO "Product" ("id", "name", "category", "value", "size", "condition", "flaw", "photo", "illustration", "status", "createdAt") VALUES
('item-1', 'Vintage 90s Wash Denim Jacket', 2, 165000, 'Setara L · P 68 cm × L 58 cm', '9.5/10 (Like New)', 'No minus', '/assets/item-1.webp', true, 'sold', '2025-01-01 00:00:01'),
('item-2', 'Boxy Oversized Graphic Tee - Dark Grey', 1, 55000, 'Fit to XL · P 72 cm × L 60 cm', '9/10', 'Sedikit pinhole kecil di bawah belakang', '/assets/item-2.webp', true, 'available', '2025-01-01 00:00:02'),
('item-3', 'Heavyweight Loose Cargo Pants - Olive', 3, 120000, 'Size 32 · LP 82 cm × P 102 cm', '9.5/10', 'No minus', '/assets/item-3.webp', true, 'available', '2025-01-01 00:00:03'),
('item-4', 'Retro Colorblock Windbreaker Jacket', 2, 145000, 'Setara XL · P 71 cm × L 62 cm', '9/10', 'Karet lengan sedikit longgar', '/assets/item-4.webp', true, 'available', '2025-01-01 00:00:04'),
('item-5', '90s Vintage Band Washed Tee', 1, 75000, 'Setara L · P 70 cm × L 55 cm', '9.5/10', 'No minus', '/assets/item-5.webp', true, 'sold', '2025-01-01 00:00:05'),
('item-6', 'Rare Vintage Workwear Jacket', 4, 240000, 'Setara L · P 69 cm × L 60 cm', '9.5/10 (Like New)', 'No minus', '/assets/item-6.webp', true, 'available', '2025-01-01 00:00:06');

COMMIT;
