import { Router } from "express";
import { requireUserId } from "../lib/auth.js";
import { isBase58Pubkey } from "../lib/solanaPda.js";
import { listCreatorRewards } from "../services/earningsList.js";
import { errMsg } from "../lib/config.js";

const router = Router();

/** GET /api/earnings/creator — claimable pump.fun creator fees per stored wallet. */
router.get("/creator", async (_req, res) => {
  try {
    res.json(await listCreatorRewards(requireUserId(_req)));
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});

/** POST /api/earnings/creator/claim { walletPubkey } */
router.post("/creator/claim", async (req, res) => {
  try {
    const walletPubkey = req.body?.walletPubkey;
    if (!walletPubkey || !isBase58Pubkey(walletPubkey)) {
      return res.status(400).json({ error: "Valid walletPubkey required" });
    }
    const { claimCreatorRewards } = await import("../services/earnings.js");
    res.json(await claimCreatorRewards(requireUserId(req), walletPubkey));
  } catch (e) {
    console.error("[earnings/claim]", e);
    const status = (e as { status?: number }).status ?? 500;
    res.status(status).json({
      error: errMsg(e),
      detail: e instanceof Error ? e.stack?.split("\n").slice(0, 4).join(" | ") : undefined,
    });
  }
});

export default router;
