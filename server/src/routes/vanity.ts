import { Router } from "express";
import { RUNPOD_API_KEY, RUNPOD_ENDPOINT_ID, errMsg } from "../lib/config.js";

const router = Router();

// Base58 alphabet (no 0, O, I, l), 1-6 chars. Longer patterns are impractical.
const PATTERN_RE = /^[1-9A-HJ-NP-Za-km-z]{1,6}$/;

const runpodBase = (): string | null =>
  RUNPOD_ENDPOINT_ID && RUNPOD_API_KEY
    ? `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`
    : null;

const runpodHeaders = () => ({
  Authorization: `Bearer ${RUNPOD_API_KEY}`,
  "Content-Type": "application/json",
});

const notConfigured = (res: import("express").Response) =>
  res.status(503).json({
    error: "GPU vanity not configured. Set RUNPOD_ENDPOINT_ID and RUNPOD_API_KEY env vars.",
  });

// POST /api/vanity — start a GPU vanity job on RunPod serverless.
router.post("/", async (req, res) => {
  try {
    const { pattern, match } = (req.body ?? {}) as { pattern?: string; match?: string };
    if (!pattern || !PATTERN_RE.test(pattern)) {
      return res.status(400).json({ error: "Invalid pattern: 1-6 Base58 chars (no 0, O, I, l)" });
    }
    if (match !== "prefix" && match !== "suffix") {
      return res.status(400).json({ error: "match must be 'prefix' or 'suffix'" });
    }

    const base = runpodBase();
    if (!base) return notConfigured(res);

    const r = await fetch(`${base}/run`, {
      method: "POST",
      headers: runpodHeaders(),
      body: JSON.stringify({ input: { pattern, match } }),
    });
    const data = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!r.ok || !data.id) {
      return res.status(502).json({ error: data.error || `RunPod error: ${r.status}` });
    }
    res.json({ jobId: data.id });
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});

// GET /api/vanity/:jobId — poll job status; returns address + secretKey when done.
router.get("/:jobId", async (req, res) => {
  try {
    const base = runpodBase();
    if (!base) return notConfigured(res);

    const r = await fetch(`${base}/status/${encodeURIComponent(req.params.jobId)}`, {
      headers: runpodHeaders(),
    });
    const data = (await r.json().catch(() => ({}))) as {
      status?: string;
      output?: { address?: string; secretKey?: string; error?: string } | null;
      error?: string;
    };
    if (!r.ok) return res.status(502).json({ error: data.error || `RunPod error: ${r.status}` });

    res.json({
      status: data.status ?? "UNKNOWN",
      address: data.output?.address,
      secretKey: data.output?.secretKey,
      error: data.output?.error ?? data.error,
    });
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});

// DELETE /api/vanity/:jobId — cancel a running/queued job.
router.delete("/:jobId", async (req, res) => {
  try {
    const base = runpodBase();
    if (!base) return notConfigured(res);

    await fetch(`${base}/cancel/${encodeURIComponent(req.params.jobId)}`, {
      method: "POST",
      headers: runpodHeaders(),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: errMsg(e) });
  }
});

export default router;
