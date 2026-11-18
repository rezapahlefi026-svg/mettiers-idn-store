import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const sessionCookie = "mettiers_admin";
export const sessionDuration = 8 * 60 * 60;

function adminPassword() {
  return process.env.ADMIN_PASSWORD || "mettiers2026";
}

function equal(first: string, second: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(first), digest(second));
}

export function validPassword(input: string) {
  return equal(input, adminPassword());
}

function signature(expires: string) {
  return createHmac("sha256", adminPassword()).update(`mettiers-admin:${expires}`).digest("hex");
}

export function createAdminSession() {
  const expires = String(Math.floor(Date.now() / 1000) + sessionDuration);
  return `${expires}.${signature(expires)}`;
}

export async function isAdmin() {
  const cookie = (await cookies()).get(sessionCookie)?.value;
  if (!cookie) return false;
  const [expires, token, extra] = cookie.split(".");
  return Boolean(!extra && token && /^[0-9]+$/.test(expires) &&
    Number(expires) > Date.now() / 1000 && equal(token, signature(expires)));
}
