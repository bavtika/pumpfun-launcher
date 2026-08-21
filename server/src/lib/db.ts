import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { DATABASE_URL } from "./config.js";

let sql: NeonQueryFunction<false, false> | null = null;
let migrated: Promise<void> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Create a Neon/Vercel Postgres database and add it to env.");
  }
  if (!sql) sql = neon(DATABASE_URL);
  return sql;
}

export async function ensureSchema(): Promise<void> {
  if (!migrated) {
    migrated = (async () => {
      const q = getSql();
      await q`CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await q`CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await q`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`;
      await q`CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)`;
      await q`CREATE TABLE IF NOT EXISTS wallets (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        pubkey TEXT NOT NULL,
        secret_enc TEXT NOT NULL,
        is_dev BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, pubkey)
      )`;
      await q`CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON wallets(user_id)`;
    })().catch((e) => {
      migrated = null;
      throw e;
    });
  }
  await migrated;
}
