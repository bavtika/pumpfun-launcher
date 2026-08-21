import { Router } from "express";
import { Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import {
  readWallets,
  publicWallet,
  createWalletsForUser,
  importWalletForUser,
  deleteWalletForUser,
  renameWalletForUser,
  setDevWalletForUser,
  type PublicWallet,
} from "../lib/wallets.js";
import { requireUserId } from "../lib/auth.js";
import { getConnection, isValidPubkey } from "../lib/solana.js";
import { errMsg } from "../lib/config.js";

const router = Router();

function statusOf(e: unknown): number {
  return (e as { status?: number }).status ?? 500;
}

/** GET /api/wallets — list this user's wallets with live balances. */
router.get("/", async (req, res) => {
  try {
    const userId = requireUserId(req);
    const wallets = await readWallets(userId);
    const conn = getConnection();

    const result = await Promise.all(
      wallets.map(async (w): Promise<PublicWallet & { balance: number | null }> => {
        try {
          const bal = await conn.getBalance(new PublicKey(w.pubkey));
          return { ...publicWallet(w), balance: bal / LAMPORTS_PER_SOL };
        } catch {
          return { ...publicWallet(w), balance: null };
        }
      })
    );

    res.json(result);
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** POST /api/wallets { count?: 1..10 } — create N wallets for this user. */
router.post("/", async (req, res) => {
  try {
    const count = Math.max(1, Math.min(10, parseInt(req.body?.count) || 1));
    const created = await createWalletsForUser(requireUserId(req), count);
    res.json(created);
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** POST /api/wallets/import { secretKey, name? } */
router.post("/import", async (req, res) => {
  try {
    const { secretKey, name } = req.body ?? {};
    if (!secretKey) return res.status(400).json({ error: "secretKey required" });
    const created = await importWalletForUser(requireUserId(req), secretKey, name);
    res.json(created);
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** DELETE /api/wallets/:pubkey */
router.delete("/:pubkey", async (req, res) => {
  try {
    await deleteWalletForUser(requireUserId(req), req.params.pubkey);
    res.json({ ok: true });
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** PATCH /api/wallets/:pubkey/name { name } */
router.patch("/:pubkey/name", async (req, res) => {
  try {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name required" });
    }
    await renameWalletForUser(requireUserId(req), req.params.pubkey, name.trim());
    res.json({ ok: true });
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** PATCH /api/wallets/:pubkey/setdev — mark as the single dev wallet for this user. */
router.patch("/:pubkey/setdev", async (req, res) => {
  try {
    await setDevWalletForUser(requireUserId(req), req.params.pubkey);
    res.json({ ok: true });
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

/** POST /api/wallets/fund { from, to, amount } — transfer SOL between this user's wallets. */
router.post("/fund", async (req, res) => {
  try {
    const { from, to, amount } = req.body ?? {};
    if (!from || !to || amount === undefined || amount === null || amount === "") {
      return res.status(400).json({ error: "from, to, amount are required" });
    }
    if (!isValidPubkey(from) || !isValidPubkey(to)) {
      return res.status(400).json({ error: "Invalid from/to pubkey" });
    }

    const lamports = Math.round(parseFloat(String(amount)) * LAMPORTS_PER_SOL);
    if (!Number.isFinite(lamports) || lamports <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const wallets = await readWallets(requireUserId(req));
    const fromWallet = wallets.find((w) => w.pubkey === from);
    if (!fromWallet) return res.status(400).json({ error: "Source wallet not found in store" });

    const fromKp = Keypair.fromSecretKey(bs58.decode(fromWallet.secretKey));
    const toPubkey = new PublicKey(to);
    const conn = getConnection();

    const bal = await conn.getBalance(fromKp.publicKey);
    if (bal < lamports + 5000) {
      return res
        .status(400)
        .json({ error: `Insufficient balance. Have ${(bal / LAMPORTS_PER_SOL).toFixed(6)} SOL` });
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: fromKp.publicKey, toPubkey, lamports })
    );
    tx.feePayer = fromKp.publicKey;
    tx.recentBlockhash = (await conn.getLatestBlockhash("processed")).blockhash;
    tx.sign(fromKp);
    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: true, maxRetries: 3 });

    console.log(`💸 Fund: ${from.slice(0, 8)}… → ${to.slice(0, 8)}… | ${amount} SOL | tx: ${sig}`);
    res.json({ signature: sig, explorer: `https://solscan.io/tx/${sig}` });
  } catch (e) {
    console.error("Fund error:", e);
    res.status(500).json({ error: errMsg(e) });
  }
});

/**
 * GET /api/wallets/export/:pubkey — returns the private key for this user's wallet.
 */
router.get("/export/:pubkey", async (req, res) => {
  try {
    const wallets = await readWallets(requireUserId(req));
    const wallet = wallets.find((w) => w.pubkey === req.params.pubkey);
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    res.json({ secretKey: wallet.secretKey, pubkey: wallet.pubkey });
  } catch (e) {
    res.status(statusOf(e)).json({ error: errMsg(e) });
  }
});

export default router;
