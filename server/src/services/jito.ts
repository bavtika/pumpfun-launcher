import {
  PublicKey,
  SystemProgram,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { JITO_BUNDLE_ENDPOINTS, JITO_TIP_ACCOUNTS } from "../lib/config.js";

const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface JitoResponse {
  result?: string;
  error?: unknown;
}

interface TipAccountsResponse {
  result?: string[];
}

/** Hard safety cap — a Jito tip above this is almost certainly a typo. */
export const MAX_JITO_TIP_SOL = 0.5;
/** Jito rejects bundles longer than this. */
export const JITO_MAX_TXS = 5;

let tipAccountsCache: { accounts: string[]; fetchedAt: number } | null = null;
const TIP_CACHE_TTL_MS = 5 * 60_000;

async function getTipAccounts(): Promise<string[]> {
  if (tipAccountsCache && Date.now() - tipAccountsCache.fetchedAt < TIP_CACHE_TTL_MS) {
    return tipAccountsCache.accounts;
  }
  try {
    const r = await fetch(JITO_BUNDLE_ENDPOINTS[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTipAccounts", params: [] }),
      signal: AbortSignal.timeout(4_000),
    });
    const data = (await r.json()) as TipAccountsResponse;
    if (Array.isArray(data.result) && data.result.length > 0) {
      tipAccountsCache = { accounts: data.result, fetchedAt: Date.now() };
      return data.result;
    }
  } catch {
    // fall through to the static list
  }
  return JITO_TIP_ACCOUNTS;
}

/** Tip instruction — attach to the last tx of a bundle (Jito requires the tip there). */
export async function buildJitoTipIx(payer: PublicKey, tipSol: number): Promise<TransactionInstruction> {
  const safeTipSol = Math.min(Math.max(tipSol, 0), MAX_JITO_TIP_SOL);
  const tipAccount = new PublicKey(randomChoice(await getTipAccounts()));
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: tipAccount,
    lamports: Math.round(safeTipSol * 1e9),
  });
}

/**
 * Sends already-signed txs as a Jito bundle, racing every block-engine endpoint.
 * First success wins. Max 5 transactions.
 */
export async function sendJitoBundle(txs: VersionedTransaction[]): Promise<string> {
  if (txs.length === 0) throw new Error("Empty Jito bundle");
  if (txs.length > JITO_MAX_TXS) throw new Error(`Jito bundle max ${JITO_MAX_TXS} transactions`);

  const encoded = txs.map((tx) => bs58.encode(Buffer.from(tx.serialize())));
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "sendBundle",
    params: [encoded],
  });

  const attempts = JITO_BUNDLE_ENDPOINTS.map(async (endpoint) => {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await r.json()) as JitoResponse;
    if (data.error) throw new Error(`Jito error: ${JSON.stringify(data.error)}`);
    if (data.result) return data.result;
    throw new Error(`Empty Jito response from ${endpoint}`);
  });

  try {
    return await Promise.any(attempts);
  } catch (e) {
    const agg = e as AggregateError;
    const last = agg?.errors?.[agg.errors.length - 1];
    throw last instanceof Error ? last : new Error("All Jito endpoints unreachable");
  }
}

interface InflightStatus {
  result?: { value?: Array<{ bundle_id?: string; status?: string }> };
}

/** Poll until Landed/Failed/timeout. Accept is not a land — we must wait. */
export async function waitForJitoBundle(bundleId: string, timeoutMs = 5000): Promise<boolean> {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getInflightBundleStatuses",
    params: [[bundleId]],
  });
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const checks = JITO_BUNDLE_ENDPOINTS.map(async (endpoint) => {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(2000),
      });
      const data = (await r.json()) as InflightStatus;
      return data.result?.value?.[0]?.status;
    });
    try {
      const statuses = await Promise.allSettled(checks);
      for (const s of statuses) {
        if (s.status !== "fulfilled" || !s.value) continue;
        if (s.value === "Landed") return true;
        if (s.value === "Failed" || s.value === "Invalid") return false;
      }
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

