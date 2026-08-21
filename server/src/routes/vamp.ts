import { Router } from "express";
import { fetchPumpCoin } from "../services/pumpApi.js";
import { deployToken, parseFeeShares, resolveCreateFlags } from "../services/deploy.js";
import { isValidPubkey } from "../lib/solana.js";
import { requireUserId } from "../lib/auth.js";
import { errMsg } from "../lib/config.js";

const router = Router();

/** GET /api/vamp?mint= — fetch source coin metadata from pump.fun. */
router.get("/", async (req, res) => {
  try {
    const { mint } = req.query as { mint?: string };
    if (!mint) return res.status(400).json({ error: "mint required" });
    if (!isValidPubkey(mint)) return res.status(400).json({ error: "Invalid mint" });

    const coin = await fetchPumpCoin(mint);
    if (!coin) return res.status(404).json({ error: "Coin not found on pump.fun" });

    res.json({
      name: coin.name || "",
      ticker: coin.symbol || "",
      description: coin.description || "",
      imageUrl: coin.image_uri || "",
    });
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});

/** POST /api/vamp/deploy { sourceMint, walletPublicKey?, buyAmount?, options? } */
router.post("/deploy", async (req, res) => {
  try {
    const {
      sourceMint,
      walletPublicKey,
      buyAmount = 0.5,
      options,
      agentBuybackPct,
      mayhemAgentMode,
      feeShares: feeSharesRaw,
    } = req.body ?? {};
    const flags = resolveCreateFlags(options, agentBuybackPct, mayhemAgentMode);
    let feeShares: { pubkey: string; shareBps: number }[] = [];
    try {
      feeShares = parseFeeShares(feeSharesRaw, flags.feeSharing, walletPublicKey);
    } catch (e) {
      return res.status(400).json({ error: errMsg(e) });
    }
    if (!sourceMint) return res.status(400).json({ error: "sourceMint required" });
    if (!isValidPubkey(sourceMint)) return res.status(400).json({ error: "Invalid sourceMint" });

    const coin = await fetchPumpCoin(sourceMint);
    if (!coin) return res.status(404).json({ error: "Coin not found on pump.fun" });

    const name = coin.name || "";
    const ticker = coin.symbol || "";
    if (!name) return res.status(400).json({ error: "Source coin has no name" });
    if (!ticker) return res.status(400).json({ error: "Source coin has no ticker" });

    const buyAmountSol = parseFloat(String(buyAmount));
    if (!Number.isFinite(buyAmountSol) || buyAmountSol < 0) {
      return res.status(400).json({ error: "buyAmount must be a non-negative number" });
    }

    const result = await deployToken({
      name,
      ticker,
      description: coin.description || "",
      imageUrl: coin.image_uri || "",
      buyAmountSol,
      walletPubkey: walletPublicKey ?? null,
      userId: requireUserId(req),
      useJito: true,
      jitoTipSol: 0.001,
      cashback: flags.cashback,
      tokenizedAgent: flags.tokenizedAgent,
      buybackBps: flags.buybackBps,
      feeShares,
      mayhemMode: flags.mayhem,
      mayhemAgentMode: flags.mayhemAgentMode,
    });

    console.log(`✅ Vamp deployed: mint=${result.mint} tx=${result.signature ?? "-"}`);
    res.json({
      ...result,
      name,
      ticker,
      imageUrl: coin.image_uri || "",
    });
  } catch (e) {
    console.error("[vamp/deploy]", e);
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
