import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, query } from "./db";
import { SESSION_COOKIE } from "./session-cookie";

// Contas próprias: senha com scrypt (sal aleatório), sessão em cookie httpOnly com token aleatório.
// No banco ficam só o hash da senha e o hash SHA-256 do token da sessão.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;
const SESSION_DAYS = 30;

export type User = { id: string; email: string };

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LEN, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, { ...SCRYPT, N: Number(n) });
  return timingSafeEqual(key, expected);
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (password.length > 200) return "A senha é longa demais.";
  return null;
}

export async function createSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [sha256(token), userId, expires]);
  // Limpeza oportunista de sessões vencidas.
  await query("delete from sessions where expires_at < now()");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

/** Usuário da sessão atual, ou null. Cacheado por requisição. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return one<User>(
    "select u.id, u.email from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()",
    [sha256(token)],
  );
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}
