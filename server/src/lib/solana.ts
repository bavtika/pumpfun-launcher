import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  type TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { RPC_URL } from "./config.js";
import { readWallets } from "./wallets.js";

let _conn: Connection | null = null;
export const getConnection = (): Connection => {
  if (!_conn) _conn = new Connection(RPC_URL, "confirmed");
  return _conn;
};

export function isValidPubkey(s: unknown): s is string {
  if (typeof s !== "string" || !s) return false;
  try {
    new PublicKey(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a keypair for signing: explicit wallet pubkey → dev-marked wallet.
 * Used both for deploys and for trades. Never falls back to a shared env key.
 */
export async function resolveWalletKeypair(
  userId: string,
  walletPubkey?: string | null
): Promise<Keypair | null> {
  const wallets = await readWallets(userId);

  if (walletPubkey) {
    const w = wallets.find((ww) => ww.pubkey === walletPubkey);
    if (w) return Keypair.fromSecretKey(bs58.decode(w.secretKey));
    return null;
  }

  const dev = wallets.find((w) => w.isDev);
  if (dev) return Keypair.fromSecretKey(bs58.decode(dev.secretKey));
  return null;
}

/** Solana UDP packet limit for a serialized transaction. */
export const MAX_TX_BYTES = 1232;

/** Build a v0 transaction, sign and send. Does not wait for confirmation. */
export function signV0Tx(
  payer: PublicKey,
  instructions: TransactionInstruction[],
  signers: Keypair[],
  blockhash: string
): VersionedTransaction {
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message()
  );
  tx.sign(signers);
  return tx;
}

export function txByteLength(tx: VersionedTransaction): number {
  return tx.serialize().length;
}

export function txFits(tx: VersionedTransaction): boolean {
  return txByteLength(tx) <= MAX_TX_BYTES;
}

/** First instruction list that serializes under the Solana packet limit. */
export function signV0TxFitting(
  payer: PublicKey,
  variants: TransactionInstruction[][],
  signers: Keypair[],
  blockhash: string
): VersionedTransaction | null {
  for (const instructions of variants) {
    if (instructions.length === 0) continue;
    const tx = signV0Tx(payer, instructions, signers, blockhash);
    if (txFits(tx)) return tx;
  }
  return null;
}

export async function buildSignAndSend(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signers: Keypair[],
  opts: { skipPreflight?: boolean } = {}
): Promise<string> {
  const conn = getConnection();
  const { blockhash } = await conn.getLatestBlockhash("processed");
  const tx = signV0Tx(payer, instructions, signers, blockhash);
  return conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: opts.skipPreflight ?? true,
    maxRetries: 3,
  });
}
