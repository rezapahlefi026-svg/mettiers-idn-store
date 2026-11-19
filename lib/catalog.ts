import { randomUUID } from "node:crypto";
import type { PhotoSlot } from "@/generated/prisma/client";
import { prisma } from "./db";

export const bookingHours = [1, 3, 6, 12, 24, 48];
export const photoSlots: PhotoSlot[] = ["front", "back", "side", "tryon", "detail"];
export const maxPhotoSize = 1024 * 1024;
export const maxProductBody = 4 * maxPhotoSize + 16384;

export async function listProducts() {
  const products = await prisma.product.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { photos: { select: { slot: true, revision: true } } },
  });
  const now = Date.now();
  return products.map(({ photos, bookingUntil, createdAt: _createdAt, ...product }) => {
    const deadline = bookingUntil?.getTime() ?? null;
    const bookingExpired = product.status === "booking" && deadline !== null && deadline <= now;
    const status = bookingExpired ? "available" : product.status;
    return {
      ...product, status, sold: status === "sold", bookingUntil: deadline,
      ...(bookingExpired && { bookingExpired: true }),
      photos: {
        front: product.photo,
        ...Object.fromEntries(photos.map(({ slot, revision }) => [
          slot, `/api/photos/${product.id}/${slot}?v=${revision}`,
        ])),
      },
    };
  });
}

export async function boundedBody(request: Request, maxSize: number) {
  if (!request.body || Number(request.headers.get("Content-Length")) > maxSize) {
    throw new Error("Invalid body size");
  }
  const reader = request.body.getReader();
  const buffer = new Uint8Array(maxSize);
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (total + value.length > maxSize) {
      await reader.cancel();
      throw new Error("Body exceeds limit");
    }
    buffer.set(value, total);
    total += value.length;
  }
  return new Response(buffer.subarray(0, total), {
    headers: { "Content-Type": request.headers.get("Content-Type") || "text/plain" },
  });
}

export function productFields(form: FormData) {
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const fields = {
    name: read("name"), category: Number(read("category")), value: Number(read("value")),
    size: read("size"), condition: read("condition"), flaw: read("flaw") || "No minus",
  };
  if (![fields.name, fields.size, fields.condition, fields.flaw].every(text => text && text.length <= 200) ||
      ![1, 2, 3, 4].includes(fields.category) || !Number.isSafeInteger(fields.value) ||
      fields.value < 1 || fields.value > 1_000_000_000) return null;
  return fields;
}

function imageType(bytes: Uint8Array) {
  const starts = (...prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
  if (starts(255, 216, 255)) return "image/jpeg";
  if (starts(137, 80, 78, 71, 13, 10, 26, 10)) return "image/png";
  if (starts(82, 73, 70, 70) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) return "image/webp";
  return null;
}

export async function collectPhotos(form: FormData) {
  const photos = [];
  for (const slot of photoSlots) {
    const file = form.get(slot === "front" ? "photo" : slot);
    if (file === null || (file instanceof File && file.size === 0)) continue;
    if (!(file instanceof File) || file.size < 12 || file.size > maxPhotoSize) return null;
    const photo = new Uint8Array(await file.arrayBuffer());
    const mime = imageType(photo);
    if (!mime) return null;
    photos.push({ slot, photo, mime, revision: randomUUID() });
  }
  return photos;
}
