import { Router } from "express";
import { getTradeBalance, buyToken, sellToken } from "../services/trade.js";
import { isValidPubkey } from "../lib/solana.js";
import { requireUserId } from "../lib/auth.js";
import { errMsg } from "../lib/config.js";

const router = Router();

/** Slippage outside 1–100% is a typo or an attack on UX; clamp to a sane band. */
function clampSlippage(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(Math.max(n, 1), 100);
}

/** GET /api/trade/balance?mint=&walletPubkey= */
router.get("/balance", async (req, res) => {
  try {
    const { mint, walletPubkey } = req.query as { mint?: string; walletPubkey?: string };
    if (!mint || !walletPubkey) {
      return res.status(400).json({ error: "mint and walletPubkey required" });
    }
    if (!isValidPubkey(mint) || !isValidPubkey(walletPubkey)) {
      return res.status(400).json({ error: "Invalid mint or walletPubkey" });
    }
    res.json(await getTradeBalance(mint, walletPubkey));
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});

/** POST /api/trade/buy { mint, walletPubkey?, solAmount, slippage? } */
router.post("/buy", async (req, res) => {
  try {
    const { mint, walletPubkey, solAmount, slippage } = req.body ?? {};
    if (!mint || solAmount === undefined || solAmount === null || solAmount === "") {
      return res.status(400).json({ error: "mint and solAmount required" });
    }
    const amount = parseFloat(String(solAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "solAmount must be a positive number" });
    }
    if (!isValidPubkey(mint)) return res.status(400).json({ error: "Invalid mint" });

    const result = await buyToken({
      mint,
      walletPubkey: walletPubkey ?? null,
      userId: requireUserId(req),
      solAmount: amount,
      slippage: clampSlippage(slippage),
    });
    console.log(`🟢 Buy: mint=${mint.slice(0, 8)}… | ${amount} SOL | tx: ${result.signature}`);
    res.json(result);
  } catch (e) {
    console.error("Buy error:", e);
    res.status(500).json({ error: errMsg(e) });
  }
});

/** POST /api/trade/sell { mint, walletPubkey?, tokenAmount?, slippage? } */
router.post("/sell", async (req, res) => {
  try {
    const { mint, walletPubkey, tokenAmount, slippage } = req.body ?? {};
    if (!mint) return res.status(400).json({ error: "mint required" });
    if (!isValidPubkey(mint)) return res.status(400).json({ error: "Invalid mint" });

    const result = await sellToken({
      mint,
      walletPubkey: walletPubkey ?? null,
      userId: requireUserId(req),
      tokenAmount: tokenAmount != null ? String(tokenAmount) : null,
      slippage: clampSlippage(slippage),
    });
    console.log(`🔴 Sell: mint=${mint.slice(0, 8)}… | tx: ${result.signature}`);
    res.json(result);
  } catch (e) {
    console.error("Sell error:", e);
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
