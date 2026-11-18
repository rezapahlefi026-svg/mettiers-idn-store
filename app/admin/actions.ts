"use server";

import { Category } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSession, isAdmin, sessionCookie, sessionDuration, validPassword } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function login(_previousError: string, form: FormData) {
  const password = form.get("password");
  if (typeof password !== "string" || !validPassword(password)) return "Password salah.";

  (await cookies()).set(sessionCookie, createAdminSession(), {
    path: "/admin", httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production", maxAge: sessionDuration,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).set(sessionCookie, "", { path: "/admin", maxAge: 0 });
  redirect("/admin");
}

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

function read(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validImage(value: string) {
  if (value.startsWith("/images/") && /^\/images\/[\w.-]+$/.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function refresh(message: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin?pesan=${message}`);
}

export async function createProduct(form: FormData) {
  await requireAdmin();
  const name = read(form, "name");
  const image = read(form, "image");
  const category = Object.values(Category).find((value) => value === read(form, "category"));
  const length = Number(read(form, "length"));
  const width = Number(read(form, "width"));
  const conditionValue = read(form, "condition");
  const condition = Number(conditionValue);
  const flaws = read(form, "flaws");
  const price = Number(read(form, "price"));

  if (!name || name.length > 120 || image.length > 2048 || !validImage(image) || !category ||
      ![length, width].every((value) => Number.isInteger(value) && value >= 1 && value <= 500) ||
      !conditionValue || !Number.isFinite(condition) || condition < 0 || condition > 10 ||
      flaws.length > 500 || !Number.isInteger(price) || price < 1 || price > 2147483647) {
    redirect("/admin?pesan=invalid");
  }

  await prisma.product.create({
    data: { name, image, category, length, width, condition, flaws: flaws || "Tidak ada minus yang dicatat.", price, featured: form.get("featured") === "on" },
  });
  refresh("ditambah");
}

export async function markSoldOut(form: FormData) {
  await requireAdmin();
  await prisma.product.updateMany({ where: { id: read(form, "id"), soldOut: false }, data: { soldOut: true } });
  refresh("sold-out");
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  await prisma.product.deleteMany({ where: { id: read(form, "id") } });
  refresh("dihapus");
}
