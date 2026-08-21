import { Router } from "express";
import multer from "multer";
import { deployToken, parseFeeShares, parseSocialFromBody, resolveCreateFlags } from "../services/deploy.js";
import { requireUserId } from "../lib/auth.js";
import { errMsg } from "../lib/config.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** POST /api/deploy (multipart/form-data) */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const name = String(body.name || "");
    const ticker = String(body.ticker || "");

    if (!name) return res.status(400).json({ error: "name is required" });
    if (!ticker) return res.status(400).json({ error: "ticker is required" });
    if (name.length > 32) return res.status(400).json({ error: `name too long (max 32, got ${name.length})` });
    if (ticker.length > 10) return res.status(400).json({ error: `ticker too long (max 10, got ${ticker.length})` });

    const buyAmountRaw = body.buyAmount;
    const buyAmountSol =
      buyAmountRaw !== undefined && buyAmountRaw !== "" ? parseFloat(String(buyAmountRaw)) : 0.5;
    if (!Number.isFinite(buyAmountSol) || buyAmountSol < 0) {
      return res.status(400).json({ error: "buyAmount must be a non-negative number" });
    }

    // Hard sanity cap: protects against fat-fingered fee input (e.g. "1" instead of "0.01").
    const rawTip = parseFloat(String(body.jitoTip || "")) || 0.001;
    const jitoTipSol = Math.min(Math.max(rawTip, 0), 0.5);
    // Use the already-configured Jito tip (no bump) — lands faster than waiting on RPC confirm.
    const useJito = body.jito !== "false" && jitoTipSol > 0;

    let bundleBuys: { pubkey: string; amountSol: number }[] = [];
    if (body.bundleWallets) {
      try {
        const raw = JSON.parse(String(body.bundleWallets)) as unknown;
        if (Array.isArray(raw)) {
          bundleBuys = raw
            .map((e) => {
              if (!e || typeof e !== "object") return null;
              const o = e as { pubkey?: unknown; amount?: unknown; amountSol?: unknown };
              if (typeof o.pubkey !== "string" || !o.pubkey) return null;
              const amt = Number(o.amountSol ?? o.amount);
              if (!Number.isFinite(amt) || amt <= 0) return null;
              return { pubkey: o.pubkey, amountSol: amt };
            })
            .filter((x): x is { pubkey: string; amountSol: number } => Boolean(x));
        }
      } catch {
        return res.status(400).json({ error: "Invalid bundleWallets JSON" });
      }
    }

    let optionsRaw: unknown = {};
    if (body.options) {
      try {
        optionsRaw = JSON.parse(String(body.options));
      } catch {
        return res.status(400).json({ error: "Invalid options JSON" });
      }
    }
    const flags = resolveCreateFlags(optionsRaw, body.agentBuybackPct, body.mayhemAgentMode);
    if (flags.feeSharing && flags.cashback) {
      return res.status(400).json({ error: "Fee sharing cannot be combined with cashback" });
    }
    if (flags.tokenizedAgent && buyAmountSol <= 0) {
      return res.status(400).json({ error: "Tokenized Agent requires an initial buy > 0 SOL" });
    }
    const walletPublicKey =
      typeof body.walletPublicKey === "string" ? body.walletPublicKey : null;
    let feeShares: { pubkey: string; shareBps: number }[] = [];
    try {
      feeShares = parseFeeShares(body.feeShares, flags.feeSharing, walletPublicKey);
    } catch (e) {
      return res.status(400).json({ error: errMsg(e) });
    }

    if (body.customCA) {
      try {
        const { Keypair } = await import("@solana/web3.js");
        const bs58 = (await import("bs58")).default;
        Keypair.fromSecretKey(bs58.decode(String(body.customCA)));
      } catch {
        return res.status(400).json({
          error: "Invalid customCA: expected a base58-encoded Solana secret key",
        });
      }
    }

    const social = parseSocialFromBody(body);

    const result = await deployToken({
      name,
      ticker,
      description: String(body.description || ""),
      buyAmountSol,
      customCA: body.customCA ? String(body.customCA) : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      walletPubkey: walletPublicKey,
      userId: requireUserId(req),
      useJito,
      jitoTipSol,
      bundleBuys,
      cashback: flags.cashback,
      tokenizedAgent: flags.tokenizedAgent,
      buybackBps: flags.buybackBps,
      feeShares,
      mayhemMode: flags.mayhem,
      mayhemAgentMode: flags.mayhemAgentMode,
      imageBuffer: req.file?.buffer ?? null,
      imageType: req.file?.mimetype ?? "image/png",
      social,
    });

    res.json(result);
  } catch (e) {
    console.error("Deploy error:", e);
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
