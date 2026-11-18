import type { Category } from "@/generated/prisma/client";

export const categoryLabels: Record<Category, string> = {
  TOPS: "Kaos & Atasan",
  OUTER: "Jaket & Outer",
  PANTS: "Celana",
};

export const priceLabel = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;
