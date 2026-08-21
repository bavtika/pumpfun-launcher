import { createHash } from "crypto";
import { PUMP_IPFS_URL } from "../lib/config.js";

export interface MetadataUploadParams {
  name: string;
  symbol: string;
  description?: string;
  imageBuffer?: Buffer | null;
  imageType?: string;
  imageUrl?: string | null;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface MetadataUploadResult {
  metadataUri?: string;
  [key: string]: unknown;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { result: MetadataUploadResult; at: number }>();
const inflight = new Map<string, Promise<MetadataUploadResult>>();

function cacheKey(p: MetadataUploadParams): string {
  const h = createHash("sha256");
  h.update(p.name);
  h.update("\0");
  h.update(p.symbol);
  h.update("\0");
  h.update(p.description || "");
  h.update("\0");
  h.update(p.twitter || "");
  h.update("\0");
  h.update(p.telegram || "");
  h.update("\0");
  h.update(p.website || "");
  h.update("\0");
  if (p.imageBuffer?.length) h.update(p.imageBuffer);
  else h.update(p.imageUrl || "");
  return h.digest("hex");
}

async function doUpload(p: MetadataUploadParams): Promise<MetadataUploadResult> {
  const form = new FormData();

  if (p.imageBuffer) {
    const blob = new Blob([new Uint8Array(p.imageBuffer)], {
      type: p.imageType || "image/png",
    });
    form.append("file", blob, "image.png");
  } else if (p.imageUrl) {
    const imgRes = await fetch(p.imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch image URL: ${imgRes.status}`);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const ct = imgRes.headers.get("content-type") || "image/png";
    const blob = new Blob([new Uint8Array(imgBuf)], { type: ct });
    form.append("file", blob, "image.png");
  }

  form.append("name", p.name);
  form.append("symbol", p.symbol);
  form.append("description", p.description || "");
  form.append("twitter", p.twitter || "");
  form.append("telegram", p.telegram || "");
  form.append("website", p.website || "");
  form.append("showName", "true");

  const res = await fetch(PUMP_IPFS_URL, {
    method: "POST",
    body: form,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`IPFS upload failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as MetadataUploadResult;
}

export async function uploadMetadataToPumpFun(
  p: MetadataUploadParams
): Promise<MetadataUploadResult> {
  const key = cacheKey(p);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = doUpload(p)
    .then((result) => {
      cache.set(key, { result, at: Date.now() });
      return result;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}
