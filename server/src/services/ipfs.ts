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

/** Ensure social links are absolute URLs — pump.fun drops bare handles. */
export function normalizeSocialUrl(raw: string | undefined | null): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  // @handle → assume X
  if (/^@[A-Za-z0-9_]{1,30}$/.test(s)) return `https://x.com/${s.slice(1)}`;
  if (/^(x\.com|twitter\.com|t\.me|telegram\.me)\//i.test(s)) return `https://${s}`;
  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}([/?#].*)?$/i.test(s)) return `https://${s}`;
  return s;
}

function cacheKey(p: MetadataUploadParams): string {
  const h = createHash("sha256");
  h.update(p.name);
  h.update("\0");
  h.update(p.symbol);
  h.update("\0");
  h.update(p.description || "");
  h.update("\0");
  h.update(normalizeSocialUrl(p.twitter));
  h.update("\0");
  h.update(normalizeSocialUrl(p.telegram));
  h.update("\0");
  h.update(normalizeSocialUrl(p.website));
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

  const twitter = normalizeSocialUrl(p.twitter);
  const telegram = normalizeSocialUrl(p.telegram);
  const website = normalizeSocialUrl(p.website);

  form.append("name", p.name);
  form.append("symbol", p.symbol);
  form.append("description", p.description || "");
  form.append("twitter", twitter);
  form.append("telegram", telegram);
  form.append("website", website);
  form.append("showName", "true");

  const socialBits = [
    twitter && "twitter",
    telegram && "telegram",
    website && "website",
  ].filter(Boolean);
  console.log(
    `[*] IPFS metadata upload: ${p.name} / ${p.symbol}` +
      (socialBits.length ? ` | socials: ${socialBits.join(", ")}` : " | socials: (none)")
  );

  const res = await fetch(PUMP_IPFS_URL, {
    method: "POST",
    body: form,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`IPFS upload failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as MetadataUploadResult;
  // Defensive: if pump echoes metadata, warn when we sent socials but they vanished.
  const meta = json.metadata;
  if (meta && typeof meta === "object" && socialBits.length) {
    const m = meta as Record<string, unknown>;
    const missing = socialBits.filter((k) => !m[k as string]);
    if (missing.length) {
      console.warn(`[~] IPFS response metadata missing social fields: ${missing.join(", ")}`);
    }
  }
  return json;
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
