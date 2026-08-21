import { api } from "../api/client";
import type { VanityWorkerIn, VanityWorkerOut } from "../workers/vanity.worker";

export type VanityMatch = "prefix" | "suffix";

export interface VanityResult {
  address: string;
  secretKey: string;
  attempts: number;
  elapsedMs: number;
}

export interface VanityProgress {
  mode: "cpu" | "gpu";
  attempts: number; // cpu only
  rate: number; // keys/sec, cpu only
  elapsedMs: number;
  status: string; // gpu queue status
}

export interface VanityJob {
  promise: Promise<VanityResult>;
  cancel: () => void;
}

export const VANITY_MAX_LEN = 6;
export const VANITY_CPU_MAX_LEN = 3;
/** Solana Base58 alphabet — excludes lookalikes 0, O, I, l. */
export const VANITY_BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Characters that look like Base58 but are not allowed in Solana addresses. */
export const VANITY_FORBIDDEN_CHARS = ["0", "O", "I", "l"] as const;

/** Expected brute-force attempts for a pattern of the given length. */
export const expectedAttempts = (len: number): number => Math.pow(58, len);

/** Unique chars in `pattern` that are not in the Base58 alphabet. */
export function invalidVanityChars(pattern: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of pattern) {
    if (VANITY_BASE58_CHARS.includes(c) || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

export function validateVanityPattern(pattern: string): string | null {
  if (!pattern) return "Enter a pattern";
  if (pattern.length > VANITY_MAX_LEN) return `Max ${VANITY_MAX_LEN} characters`;
  const bad = invalidVanityChars(pattern);
  if (bad.length === 0) return null;
  const lookalikes = bad.filter((c) => (VANITY_FORBIDDEN_CHARS as readonly string[]).includes(c));
  const other = bad.filter((c) => !(VANITY_FORBIDDEN_CHARS as readonly string[]).includes(c));
  const bits: string[] = [];
  if (lookalikes.length) bits.push(lookalikes.join(", "));
  if (other.length) bits.push(other.map((c) => (c === " " ? "space" : c)).join(", "));
  return `Forbidden in CA: ${bits.join("; ")}. Base58 cannot use 0, O, I, l`;
}

function startCpuVanity(
  pattern: string,
  match: VanityMatch,
  onProgress: (p: VanityProgress) => void
): VanityJob {
  const cores = Math.max(1, Math.min(16, navigator.hardwareConcurrency || 4));
  const startedAt = performance.now();
  let total = 0;
  let settled = false;

  const workers = Array.from(
    { length: cores },
    () => new Worker(new URL("../workers/vanity.worker.ts", import.meta.url), { type: "module" })
  );
  const stopAll = () => workers.forEach((w) => w.terminate());

  let resolveFn!: (r: VanityResult) => void;
  let rejectFn!: (e: Error) => void;
  const promise = new Promise<VanityResult>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  workers.forEach((w) => {
    w.onmessage = (e: MessageEvent<VanityWorkerOut>) => {
      const msg = e.data;
      if (msg.type === "progress") {
        total += msg.attempts;
        const elapsedMs = performance.now() - startedAt;
        onProgress({
          mode: "cpu",
          attempts: total,
          rate: elapsedMs > 0 ? (total / elapsedMs) * 1000 : 0,
          elapsedMs,
          status: "",
        });
        return;
      }
      if (msg.type === "found" && !settled) {
        settled = true;
        stopAll();
        resolveFn({
          address: msg.address!,
          secretKey: msg.secretKey!,
          attempts: total + msg.attempts,
          elapsedMs: performance.now() - startedAt,
        });
      }
    };
    w.onerror = (err) => {
      if (!settled) {
        settled = true;
        stopAll();
        rejectFn(new Error(err.message || "Vanity worker failed"));
      }
    };
    w.postMessage({ type: "start", pattern, match } satisfies VanityWorkerIn);
  });

  return {
    promise,
    cancel: () => {
      if (!settled) {
        settled = true;
        stopAll();
        rejectFn(new Error("Cancelled"));
      }
    },
  };
}

function startGpuVanity(
  pattern: string,
  match: VanityMatch,
  onProgress: (p: VanityProgress) => void
): VanityJob {
  const startedAt = performance.now();
  let cancelled = false;
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let jobId: string | null = null;

  let resolveFn!: (r: VanityResult) => void;
  let rejectFn!: (e: Error) => void;
  const promise = new Promise<VanityResult>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  const tick = async () => {
    if (cancelled || settled || !jobId) return;
    try {
      const st = await api.vanityStatus(jobId);
      if (cancelled || settled) return;
      const elapsedMs = performance.now() - startedAt;
      if (st.status === "COMPLETED" && st.address && st.secretKey) {
        settled = true;
        resolveFn({ address: st.address, secretKey: st.secretKey, attempts: 0, elapsedMs });
        return;
      }
      if (st.status === "FAILED" || st.status === "CANCELLED") {
        settled = true;
        rejectFn(new Error(st.error || `GPU job ${st.status.toLowerCase()}`));
        return;
      }
      onProgress({ mode: "gpu", attempts: 0, rate: 0, elapsedMs, status: st.status });
      timer = setTimeout(tick, 3000);
    } catch (e) {
      if (!settled) {
        settled = true;
        rejectFn(e instanceof Error ? e : new Error("GPU status poll failed"));
      }
    }
  };

  api
    .vanityStart(pattern, match)
    .then((r) => {
      if (cancelled) {
        api.vanityCancel(r.jobId).catch(() => {});
        if (!settled) {
          settled = true;
          rejectFn(new Error("Cancelled"));
        }
        return;
      }
      jobId = r.jobId;
      onProgress({ mode: "gpu", attempts: 0, rate: 0, elapsedMs: 0, status: "IN_QUEUE" });
      timer = setTimeout(tick, 1500);
    })
    .catch((e) => {
      if (!settled) {
        settled = true;
        rejectFn(e instanceof Error ? e : new Error("GPU request failed"));
      }
    });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (jobId) api.vanityCancel(jobId).catch(() => {});
      if (!settled) {
        settled = true;
        rejectFn(new Error("Cancelled"));
      }
    },
  };
}

/**
 * Starts vanity generation. 1–3 chars grind locally on the user's CPU
 * (Web Worker pool); 4–6 chars go to the RunPod serverless GPU worker
 * via the server proxy.
 */
export function startVanity(
  pattern: string,
  match: VanityMatch,
  onProgress: (p: VanityProgress) => void
): VanityJob {
  const err = validateVanityPattern(pattern);
  if (err) {
    return {
      promise: Promise.reject(new Error(err)),
      cancel: () => {},
    };
  }
  if (pattern.length <= VANITY_CPU_MAX_LEN) return startCpuVanity(pattern, match, onProgress);
  return startGpuVanity(pattern, match, onProgress);
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
