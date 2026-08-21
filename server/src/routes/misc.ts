import { Router } from "express";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, isValidPubkey } from "../lib/solana.js";
import { fetchMarketCap } from "../services/pumpApi.js";
import { errMsg } from "../lib/config.js";

const router = Router();

/** GET /api/balance/:pubkey */
router.get("/balance/:pubkey", async (req, res) => {
  try {
    if (!isValidPubkey(req.params.pubkey)) {
      return res.status(400).json({ error: "Invalid pubkey" });
    }
    const conn = getConnection();
    const bal = await conn.getBalance(new PublicKey(req.params.pubkey));
    res.json({ sol: bal / LAMPORTS_PER_SOL });
  } catch (e) {
    res.status(400).json({ error: errMsg(e) });
  }
});

/** GET /api/mcap/:mint — never errors; { mcap: null } on any failure. */
router.get("/mcap/:mint", async (req, res) => {
  const mcap = await fetchMarketCap(req.params.mint);
  res.json({ mcap });
});

/**
 * GET /api/img?u=<url> — server-side image proxy.
 * Coin images live on public IPFS gateways that are slow or blocked; the browser
 * always loads from localhost instead. Host whitelist prevents open-proxy abuse.
 */
const IMG_HOSTS = [
  /(^|\.)ipfs\.io$/,
  /(^|\.)pump\.fun$/,
  /(^|\.)mypinata\.cloud$/,
  /(^|\.)dweb\.link$/,
  /(^|\.)arweave\.net$/,
  /(^|\.)j7tracker\.io$/,
  /(^|\.)nftstorage\.link$/,
  /(^|\.)w3s\.link$/,
];

const IMG_FALLBACK_GATEWAYS = ["https://pump.mypinata.cloud/ipfs/", "https://dweb.link/ipfs/"];

router.get("/img", async (req, res) => {
  const raw = typeof req.query.u === "string" ? req.query.u : "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return res.status(400).json({ error: "Invalid protocol" });
  }
  if (!IMG_HOSTS.some((re) => re.test(url.hostname))) {
    return res.status(403).json({ error: "Host not allowed" });
  }

  const candidates = [url.toString()];
  // Public ipfs.io is the flakiest gateway — queue alternates for the same CID.
  const ipfsMatch = url.toString().match(/^https?:\/\/[^/]+\/ipfs\/(.+)$/);
  if (ipfsMatch) {
    for (const gw of IMG_FALLBACK_GATEWAYS) candidates.push(gw + ipfsMatch[1]);
  }

  const fetches = candidates.map(async (candidate) => {
    const upstream = await fetch(candidate, {
      signal: AbortSignal.timeout(5_000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!upstream.ok) throw new Error("bad status");
    const ct = upstream.headers.get("content-type") || "image/png";
    if (!ct.startsWith("image/")) throw new Error("not image");
    return { ct, buf: Buffer.from(await upstream.arrayBuffer()) };
  });
  try {
    const { ct, buf } = await Promise.any(fetches);
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.end(buf);
  } catch {
    res.status(502).json({ error: "Image unavailable" });
  }
});

export default router;
