import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  insertWallet,
  publicWallet,
  readWallets,
  type PublicWallet,
} from "./walletStore.js";

export {
  deleteWalletForUser,
  insertWallet,
  publicWallet,
  readWallets,
  renameWalletForUser,
  setDevWalletForUser,
  type PublicWallet,
  type StoredWallet,
} from "./walletStore.js";

export async function createWalletsForUser(userId: string, count: number): Promise<PublicWallet[]> {
  const existing = await readWallets(userId);
  const out: PublicWallet[] = [];
  for (let i = 0; i < count; i++) {
    const kp = Keypair.generate();
    const created = await insertWallet(userId, {
      name: `Wallet ${existing.length + i + 1}`,
      pubkey: kp.publicKey.toBase58(),
      secretKey: bs58.encode(kp.secretKey),
      isDev: existing.length === 0 && i === 0,
    });
    out.push(publicWallet(created));
  }
  return out;
}

export async function importWalletForUser(
  userId: string,
  secretKey: string,
  name?: string
): Promise<PublicWallet> {
  let kp: Keypair;
  try {
    kp = Keypair.fromSecretKey(bs58.decode(secretKey));
  } catch {
    throw Object.assign(new Error("Invalid private key — expected base58"), { status: 400 });
  }
  const pubkey = kp.publicKey.toBase58();
  const existing = await readWallets(userId);
  if (existing.some((w) => w.pubkey === pubkey)) {
    throw Object.assign(new Error("Wallet already exists"), { status: 400 });
  }
  const created = await insertWallet(userId, {
    name: typeof name === "string" && name.trim() ? name.trim() : `Wallet ${existing.length + 1}`,
    pubkey,
    secretKey: bs58.encode(kp.secretKey),
    isDev: existing.length === 0,
  });
  return publicWallet(created);
}
