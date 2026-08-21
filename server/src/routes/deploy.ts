import { Router } from "express";
import multer from "multer";
import { deployToken, parseFeeShares, resolveCreateFlags } from "../services/deploy.js";
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
    const body = req.body as Record<string, string | undefined>;
    const name = body.name || "";
    const ticker = body.ticker || "";

    if (!name) return res.status(400).json({ error: "name is required" });
    if (!ticker) return res.status(400).json({ error: "ticker is required" });
    if (name.length > 32) return res.status(400).json({ error: `name too long (max 32, got ${name.length})` });
    if (ticker.length > 10) return res.status(400).json({ error: `ticker too long (max 10, got ${ticker.length})` });

    const buyAmountSol =
      body.buyAmount !== undefined && body.buyAmount !== "" ? parseFloat(body.buyAmount) : 0.5;
    if (!Number.isFinite(buyAmountSol) || buyAmountSol < 0) {
      return res.status(400).json({ error: "buyAmount must be a non-negative number" });
    }

    // Hard sanity cap: protects against fat-fingered fee input (e.g. "1" instead of "0.01").
    const rawTip = parseFloat(body.jitoTip || "") || 0.001;
    const jitoTipSol = Math.min(Math.max(rawTip, 0), 0.5);
    // Use the already-configured Jito tip (no bump) — lands faster than waiting on RPC confirm.
    const useJito = body.jito !== "false" && jitoTipSol > 0;

    let bundleBuys: { pubkey: string; amountSol: number }[] = [];
    if (body.bundleWallets) {
      try {
        const raw = JSON.parse(body.bundleWallets) as unknown;
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
        optionsRaw = JSON.parse(body.options);
      } catch {
        return res.status(400).json({ error: "Invalid options JSON" });
      }
    }
    const flags = resolveCreateFlags(optionsRaw, body.agentBuybackPct, body.mayhemAgentMode);
    let feeShares: { pubkey: string; shareBps: number }[] = [];
    try {
      feeShares = parseFeeShares(body.feeShares, flags.feeSharing, body.walletPublicKey);
    } catch (e) {
      return res.status(400).json({ error: errMsg(e) });
    }

    const result = await deployToken({
      name,
      ticker,
      description: body.description || "",
      buyAmountSol,
      customCA: body.customCA || null,
      imageUrl: body.imageUrl || null,
      walletPubkey: body.walletPublicKey || null,
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
      social: {
        twitter: body["social[twitter]"] || "",
        telegram: body["social[telegram]"] || "",
        website: body["social[website]"] || "",
      },
    });

    res.json(result);
  } catch (e) {
    console.error("Deploy error:", e);
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
