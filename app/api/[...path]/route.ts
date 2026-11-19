import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { Prisma, type PhotoSlot } from "@/generated/prisma/client";
import { authenticate, isAdmin } from "@/lib/catalog-auth";
import { bookingHours, boundedBody, collectPhotos, listProducts, maxProductBody, photoSlots, productFields } from "@/lib/catalog";
import { prisma } from "@/lib/db";

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});
const problem = (message: string, status: number) => json({ message }, status);
const notFound = () => problem("Produk tidak ditemukan.", 404);
const validId = (id: string | undefined): id is string => Boolean(id && /^[a-z0-9-]{1,80}$/.test(id));

async function productPhoto(id: string, slot?: string) {
  const key = slot ?? "front";
  if (!photoSlots.includes(key as PhotoSlot)) return problem("Foto tidak ditemukan.", 404);
  const data = await prisma.productPhoto.findUnique({
    where: { productId_slot: { productId: id, slot: key as PhotoSlot } },
    select: { photo: true, mime: true },
  });
  if (!data) return problem("Foto tidak ditemukan.", 404);
  return new Response(new Uint8Array(data.photo), {
    headers: {
      "Content-Type": data.mime, "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff",
    },
  });
}

async function saveProduct(request: Request, id?: string, photosOnly = false) {
  const form = await boundedBody(request, maxProductBody).then(body => body.formData()).catch(() => null);
  if (!form) return problem("Formulir tidak valid atau ukuran unggahan terlalu besar.", 400);

  const fields = photosOnly ? null : productFields(form);
  if (!photosOnly && !fields) return problem("Periksa kembali data produk.", 400);
  const photos = await collectPhotos(form);
  if (!id && fields) {
    if (!photos?.some(photo => photo.slot === "front")) {
      return problem("Sertakan foto depan. Gunakan JPG, PNG, atau WebP maksimal 1 MB per foto.", 400);
    }
    const productId = randomUUID();
    const product = await prisma.product.create({
      data: { ...fields, id: productId, photo: `/api/photos/${productId}`, photos: { create: photos } },
    });
    return json(product, 201);
  }

  if (!id) return notFound();
  if (!photos || (photosOnly && !photos.length)) {
    return problem("Pilih foto JPG, PNG, atau WebP maksimal 1 MB per foto.", 400);
  }
  if (!fields && photos.length === 0) return json({ ok: true });
  await prisma.product.update({
    where: { id },
    data: {
      ...fields,
      photos: {
        upsert: photos.map(({ slot, ...content }) => ({
          where: { productId_slot: { productId: id, slot } },
          create: { slot, ...content },
          update: content,
        })),
      },
    },
  });
  return json({ ok: true });
}

async function changeStock(request: Request, id: string) {
  const data = await boundedBody(request, 4096).then(body => body.json()).catch(() => null);
  const status = data?.status ?? (typeof data?.sold === "boolean" ? (data.sold ? "sold" : "available") : null);
  if (status !== "available" && status !== "booking" && status !== "sold") {
    return problem("Status stok tidak valid.", 400);
  }
  const hours = data?.bookingHours ?? 24;
  if (status === "booking" && !bookingHours.includes(hours)) return problem("Durasi booking tidak valid.", 400);
  const bookingUntil = status === "booking" ? new Date(Date.now() + hours * 3_600_000) : null;
  await prisma.product.update({ where: { id }, data: { status, bookingUntil } });
  return json({ ok: true });
}

async function api(request: NextRequest, path: string[]) {
  const { method, headers, nextUrl } = request;
  const [group, id, slot] = path;
  if (method === "GET" && group === "products" && path.length === 1) return json(await listProducts());
  if (method === "GET" && group === "photos" && validId(id) && path.length <= 3) {
    return productPhoto(id, slot);
  }

  if (method !== "GET" && (headers.get("Origin") !== nextUrl.origin || headers.get("X-Catalog-Admin") !== "1")) {
    return problem("Permintaan ditolak.", 403);
  }
  if (method === "POST" && group === "admin" && id === "login" && path.length === 2) {
    const data = await boundedBody(request, 4096).then(body => body.json()).catch(() => null);
    const result = await authenticate(request, data?.password);
    return "session" in result ? json(result) : problem(result.message, result.status);
  }

  if (!isAdmin(request)) return problem("Silakan masuk sebagai admin.", 401);
  if (method === "GET" && group === "admin" && id === "session" && path.length === 2) return json({ admin: true });
  if (group === "products") {
    if (method === "POST" && path.length === 1) return saveProduct(request);
    if (validId(id)) {
      if (method === "POST" && path.length === 3 && slot === "photos") return saveProduct(request, id, true);
      if (path.length === 2) {
        if (method === "PUT") return saveProduct(request, id);
        if (method === "PATCH") return changeStock(request, id);
        if (method === "DELETE") {
          await prisma.product.delete({ where: { id } });
          return json({ ok: true });
        }
      }
    }
  }
  return problem("Halaman tidak ditemukan.", 404);
}

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    return await api(request, (await context.params).path);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2003"].includes(error.code)) {
      return notFound();
    }
    console.error("Catalog request failed", error instanceof Error ? error.name : "Unknown error");
    return problem("Permintaan gagal diproses. Coba lagi.", 500);
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
