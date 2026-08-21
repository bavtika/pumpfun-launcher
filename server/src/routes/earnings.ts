import { Router } from "express";
import { requireUserId } from "../lib/auth.js";
import { isValidPubkey } from "../lib/solana.js";
import { claimCreatorRewards, listCreatorRewards } from "../services/earnings.js";
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
    if (!walletPubkey || !isValidPubkey(walletPubkey)) {
      return res.status(400).json({ error: "Valid walletPubkey required" });
    }
    res.json(await claimCreatorRewards(requireUserId(req), walletPubkey));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    res.status(status).json({ error: errMsg(e) });
  }
});

export default router;
