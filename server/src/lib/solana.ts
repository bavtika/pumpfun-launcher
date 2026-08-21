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

/** Solana UDP packet limit for a serialized transaction. */
export const MAX_TX_BYTES = 1232;

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

/** Build a v0 transaction and sign it. Does not send. */
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

export async function mintExists(conn: Connection, mint: PublicKey): Promise<boolean> {
  const info = await conn.getAccountInfo(mint, "confirmed").catch(() => null);
  return Boolean(info);
}

/**
 * Send a signed tx and wait until confirmed, or until `successMint` appears.
 * Re-broadcasts periodically (same bytes → same signature) to survive flaky RPCs.
 */
export async function sendAndConfirmTx(
  conn: Connection,
  tx: VersionedTransaction,
  opts: {
    label?: string;
    blockhash: string;
    lastValidBlockHeight: number;
    successMint?: PublicKey | null;
  }
): Promise<string> {
  const label = opts.label ?? "Transaction";
  const raw = tx.serialize();
  const sig = await conn.sendRawTransaction(raw, {
    skipPreflight: true,
    maxRetries: 2,
  });

  const rebcast = setInterval(() => {
    void conn
      .sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 })
      .catch(() => undefined);
  }, 2500);

  try {
    while (true) {
      const height = await conn.getBlockHeight("confirmed").catch(() => 0);
      if (height > opts.lastValidBlockHeight) break;

      if (opts.successMint && (await mintExists(conn, opts.successMint))) {
        return sig;
      }

      const st = await conn.getSignatureStatus(sig, { searchTransactionHistory: false });
      const v = st.value;
      if (v?.err) {
        throw new Error(`${label} failed: ${JSON.stringify(v.err)}`);
      }
      if (v?.confirmationStatus === "confirmed" || v?.confirmationStatus === "finalized") {
        return sig;
      }

      await new Promise((r) => setTimeout(r, 750));
    }

    if (opts.successMint && (await mintExists(conn, opts.successMint))) return sig;
    const late = await conn.getSignatureStatus(sig, { searchTransactionHistory: true });
    if (late.value?.err) {
      throw new Error(`${label} failed: ${JSON.stringify(late.value.err)}`);
    }
    if (
      late.value?.confirmationStatus === "confirmed" ||
      late.value?.confirmationStatus === "finalized"
    ) {
      return sig;
    }
    throw new Error(
      `${label} not confirmed before blockhash expiry. Check https://solscan.io/tx/${sig}`
    );
  } finally {
    clearInterval(rebcast);
  }
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
