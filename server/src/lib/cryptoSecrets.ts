import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { WALLET_ENCRYPTION_KEY } from "./config.js";

const SCRYPT_N_PREFIX = "scrypt";

function walletKey(): Buffer {
  const raw = WALLET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY is not set. Use 64 hex chars or a passphrase of at least 16 characters."
    );
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  if (raw.length < 16) {
    throw new Error("WALLET_ENCRYPTION_KEY passphrase must be at least 16 characters");
  }
  return scryptSync(raw, "pumpfun-launcher-wallets-v1", 32);
}

export function encryptSecret(plain: string): string {
  const key = walletKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 29) throw new Error("Corrupt wallet secret");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", walletKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${SCRYPT_N_PREFIX}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== SCRYPT_N_PREFIX || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}
