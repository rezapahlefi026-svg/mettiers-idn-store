import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";

const sessionLifetime = 4 * 60 * 60;

function sign(password: string, value: string) {
  return createHmac("sha256", password).update(value).digest("hex");
}

function matches(value: unknown, expected: string) {
  if (typeof value !== "string") return false;
  const hash = (input: string) => createHash("sha256").update(input).digest();
  return timingSafeEqual(hash(value), hash(expected));
}

type LoginResult = { session: string } | { status: number; message: string };

export async function authenticate(request: Request, password: unknown): Promise<LoginResult> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return { status: 503, message: "Login admin belum dikonfigurasi." };

  const address = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const client = sign(secret, "admin-client:" + address);
  const window = Math.floor(Date.now() / 900000);
  await prisma.loginAttempt.deleteMany({ where: { window: { lt: window - 1 } } });
  const [row] = await prisma.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginAttempt" ("client", "window", "attempts") VALUES (${client}, ${window}, 1)
    ON CONFLICT ("client") DO UPDATE SET
      "attempts" = CASE WHEN "LoginAttempt"."window" = EXCLUDED."window"
        THEN LEAST("LoginAttempt"."attempts" + 1, 9) ELSE 1 END,
      "window" = EXCLUDED."window"
    RETURNING "attempts"
  `;

  if (row.attempts > 8) return { status: 429, message: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
  if (!matches(password, secret)) return { status: 401, message: "Password admin salah." };

  await prisma.loginAttempt.deleteMany({ where: { client, window } });
  const value = `${Math.floor(Date.now() / 1000) + sessionLifetime}.${randomUUID()}`;
  return { session: value + "." + sign(secret, "admin-session:" + value) };
}

export function isAdmin(request: Request) {
  const secret = process.env.ADMIN_PASSWORD;
  const token = request.headers.get("X-Catalog-Session");
  if (!token || !secret) return false;
  const [expiry, nonce, signature, extra] = token.split(".");
  if (extra !== undefined || !/^\d{10}$/.test(expiry) || Number(expiry) <= Date.now() / 1000 ||
      !/^[\da-f-]{36}$/.test(nonce)) return false;
  return matches(signature, sign(secret, `admin-session:${expiry}.${nonce}`));
}
