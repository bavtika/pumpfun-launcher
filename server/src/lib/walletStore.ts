import { encryptSecret, decryptSecret } from "./cryptoSecrets.js";
import { ensureSchema, getSql } from "./db.js";

export interface StoredWallet {
  id: number;
  name: string;
  pubkey: string;
  secretKey: string;
  isDev: boolean;
  createdAt: string;
}

export type PublicWallet = Omit<StoredWallet, "secretKey">;

type WalletRow = {
  id: string | number;
  name: string;
  pubkey: string;
  secret_enc: string;
  is_dev: boolean;
  created_at: string | Date;
};

export function publicWallet(w: StoredWallet): PublicWallet {
  const { secretKey: _secretKey, ...pub } = w;
  return pub;
}

function fromRow(row: WalletRow): StoredWallet {
  return {
    id: Number(row.id),
    name: row.name,
    pubkey: row.pubkey,
    secretKey: decryptSecret(row.secret_enc),
    isDev: Boolean(row.is_dev),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function readWallets(userId: string): Promise<StoredWallet[]> {
  await ensureSchema();
  const q = getSql();
  const rows = (await q`SELECT id, name, pubkey, secret_enc, is_dev, created_at
    FROM wallets WHERE user_id = ${userId} ORDER BY created_at ASC`) as WalletRow[];
  return rows.map(fromRow);
}

export async function insertWallet(
  userId: string,
  w: { name: string; pubkey: string; secretKey: string; isDev: boolean }
): Promise<StoredWallet> {
  await ensureSchema();
  const q = getSql();
  const rows = (await q`INSERT INTO wallets (user_id, name, pubkey, secret_enc, is_dev)
    VALUES (${userId}, ${w.name}, ${w.pubkey}, ${encryptSecret(w.secretKey)}, ${w.isDev})
    RETURNING id, name, pubkey, secret_enc, is_dev, created_at`) as WalletRow[];
  return fromRow(rows[0]);
}

export async function deleteWalletForUser(userId: string, pubkey: string): Promise<void> {
  await ensureSchema();
  const q = getSql();
  const rows = await q`DELETE FROM wallets WHERE user_id = ${userId} AND pubkey = ${pubkey} RETURNING id`;
  if (rows.length === 0) throw Object.assign(new Error("Wallet not found"), { status: 404 });
}

export async function renameWalletForUser(userId: string, pubkey: string, name: string): Promise<void> {
  await ensureSchema();
  const q = getSql();
  const rows = await q`UPDATE wallets SET name = ${name} WHERE user_id = ${userId} AND pubkey = ${pubkey} RETURNING id`;
  if (rows.length === 0) throw Object.assign(new Error("Wallet not found"), { status: 404 });
}

export async function setDevWalletForUser(userId: string, pubkey: string): Promise<void> {
  await ensureSchema();
  const q = getSql();
  const found = await q`SELECT id FROM wallets WHERE user_id = ${userId} AND pubkey = ${pubkey} LIMIT 1`;
  if (found.length === 0) throw Object.assign(new Error("Wallet not found"), { status: 404 });
  await q`UPDATE wallets SET is_dev = (pubkey = ${pubkey}) WHERE user_id = ${userId}`;
}
