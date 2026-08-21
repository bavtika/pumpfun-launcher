import type { Request, Response } from "express";
import { SITE_PASSWORD } from "./config.js";
import { ensureSchema, getSql } from "./db.js";
import { hashPassword, randomToken, safeEqualString, sha256Hex, verifyPassword } from "./cryptoSecrets.js";

const SESSION_DAYS = 30;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export interface AuthUser {
  id: string;
  username: string;
}

export function cookieSid(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    if (k === "sid") return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function isHttps(req: Request): boolean {
  return req.secure || req.headers["x-forwarded-proto"] === "https";
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const parts = [
    `sid=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
  ];
  if (isHttps(req)) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const parts = ["sid=", "HttpOnly", "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (isHttps(req)) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function requireUserId(req: Request): string {
  const id = (req as Request & { userId?: string }).userId;
  if (!id) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return id;
}

export function assertSitePassword(provided: unknown): void {
  if (!SITE_PASSWORD) {
    throw Object.assign(new Error("SITE_PASSWORD is not configured on the server"), { status: 503 });
  }
  if (typeof provided !== "string" || !safeEqualString(provided, SITE_PASSWORD)) {
    throw Object.assign(new Error("Invalid access password"), { status: 403 });
  }
}

export function normalizeUsername(raw: unknown): string {
  if (typeof raw !== "string") {
    throw Object.assign(new Error("Username required"), { status: 400 });
  }
  const username = raw.trim();
  if (!USERNAME_RE.test(username)) {
    throw Object.assign(new Error("Username: 3–24 letters, numbers, or underscore"), { status: 400 });
  }
  return username.toLowerCase();
}

export function normalizePassword(raw: unknown): string {
  if (typeof raw !== "string" || raw.length < 6) {
    throw Object.assign(new Error("Password must be at least 6 characters"), { status: 400 });
  }
  if (raw.length > 200) {
    throw Object.assign(new Error("Password too long"), { status: 400 });
  }
  return raw;
}

export async function createSession(userId: string): Promise<string> {
  await ensureSchema();
  const token = randomToken();
  const tokenHash = sha256Hex(token);
  const q = getSql();
  await q`INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, now() + interval '30 days')`;
  return token;
}

export async function userFromSession(token: string | null): Promise<AuthUser | null> {
  if (!token) return null;
  await ensureSchema();
  const q = getSql();
  const rows = await q`SELECT u.id, u.username
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256Hex(token)} AND s.expires_at > now()
    LIMIT 1`;
  const row = rows[0] as { id?: string; username?: string } | undefined;
  if (!row?.id || !row.username) return null;
  return { id: row.id, username: row.username };
}

export async function destroySession(token: string | null): Promise<void> {
  if (!token) return;
  await ensureSchema();
  const q = getSql();
  await q`DELETE FROM sessions WHERE token_hash = ${sha256Hex(token)}`;
}

export async function registerUser(username: string, password: string, sitePassword: unknown): Promise<AuthUser> {
  assertSitePassword(sitePassword);
  await ensureSchema();
  const q = getSql();
  const passwordHash = hashPassword(password);
  try {
    const rows = await q`INSERT INTO users (username, password_hash)
      VALUES (${username}, ${passwordHash})
      RETURNING id, username`;
    const row = rows[0] as { id: string; username: string };
    return { id: row.id, username: row.username };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique") || msg.includes("23505")) {
      throw Object.assign(new Error("Username already taken"), { status: 409 });
    }
    throw e;
  }
}

export async function loginUser(username: string, password: string, sitePassword: unknown): Promise<AuthUser> {
  assertSitePassword(sitePassword);
  await ensureSchema();
  const q = getSql();
  const rows = await q`SELECT id, username, password_hash FROM users WHERE username = ${username} LIMIT 1`;
  const row = rows[0] as { id?: string; username?: string; password_hash?: string } | undefined;
  if (!row?.id || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    throw Object.assign(new Error("Invalid username or password"), { status: 401 });
  }
  return { id: row.id, username: row.username ?? username };
}
