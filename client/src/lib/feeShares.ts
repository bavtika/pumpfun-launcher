import bs58 from "bs58";
import type { FeeShareRow, PublicWallet } from "../api/types";

export const MAX_FEE_SHAREHOLDERS = 10;

export type { FeeShareRow };

export interface FeeSharePayload {
  pubkey: string;
  shareBps: number;
}

export function isSolanaPubkey(s: string): boolean {
  try {
    return bs58.decode(s.trim()).length === 32;
  } catch {
    return false;
  }
}

export function resolveDevPubkey(
  wallets: Pick<PublicWallet, "pubkey" | "isDev">[],
  selectedPubkey?: string | null
): string {
  if (selectedPubkey && wallets.some((w) => w.pubkey === selectedPubkey)) return selectedPubkey;
  return wallets.find((w) => w.isDev)?.pubkey || wallets[0]?.pubkey || selectedPubkey || "";
}

/** Keep the locked Dev row pointed at the current Dev wallet. */
export function applyDevToFeeShares(rows: FeeShareRow[], newDev: string): FeeShareRow[] {
  if (!newDev) return rows;
  if (!rows.length) return defaultFeeShares(newDev);
  const extras = rows.slice(1).filter((r) => r.address.trim() !== newDev);
  return withDevRemainder([{ address: newDev, pct: 0 }, ...extras]);
}

export function defaultFeeShares(devPubkey: string): FeeShareRow[] {
  return [{ address: devPubkey, pct: 100 }];
}

function rowPct(r: FeeShareRow): number {
  const n = Math.floor(Number(r.pct));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, n);
}

/** Dev always holds the remainder so every row set totals 100%. */
export function withDevRemainder(rows: FeeShareRow[]): FeeShareRow[] {
  if (!rows.length) return rows;
  const extras = rows.slice(1).map((r) => ({ ...r, pct: rowPct(r) }));
  let extraSum = extras.reduce((a, r) => a + r.pct, 0);
  if (extraSum > 100) {
    let overflow = extraSum - 100;
    for (let i = extras.length - 1; i >= 0 && overflow > 0; i--) {
      const take = Math.min(extras[i].pct, overflow);
      extras[i] = { ...extras[i], pct: extras[i].pct - take };
      overflow -= take;
    }
    extraSum = extras.reduce((a, r) => a + r.pct, 0);
  }
  return [{ ...rows[0], pct: 100 - extraSum }, ...extras];
}

/** Change an extra wallet's %. Clamped so extras never take more than 100%. Dev is remainder. */
export function setSharePct(rows: FeeShareRow[], index: number, raw: number): FeeShareRow[] {
  if (!rows.length || index <= 0) return withDevRemainder(rows);
  const requested = Math.max(0, Math.min(100, Math.floor(Number.isFinite(raw) ? raw : 0)));
  const otherExtras = rows.slice(1).reduce((sum, r, j) => (j + 1 === index ? sum : sum + rowPct(r)), 0);
  const pct = Math.min(requested, Math.max(0, 100 - otherExtras));
  return withDevRemainder(rows.map((r, i) => (i === index ? { ...r, pct } : r)));
}

export function splitEqualPct(count: number): number[] {
  const n = Math.max(1, count);
  const base = Math.floor(100 / n);
  const rem = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i >= n - rem ? 1 : 0));
}

export function feeShareError(rows: FeeShareRow[]): string | null {
  if (rows.slice(1).some((r) => !r.address.trim() && rowPct(r) > 0)) {
    return "Fill in every wallet address";
  }
  const filled = rows
    .map((r) => ({ address: r.address.trim(), pct: Number(r.pct) }))
    .filter((r) => r.address && r.pct > 0);
  if (!filled.length) return "Add at least one fee-sharing wallet";
  if (filled.length > MAX_FEE_SHAREHOLDERS) return "Fee sharing allows at most 10 wallets";
  const seen = new Set<string>();
  for (const r of filled) {
    if (!isSolanaPubkey(r.address)) return `Invalid wallet ${r.address.slice(0, 8)}…`;
    if (seen.has(r.address)) return "Duplicate fee-sharing wallets";
    seen.add(r.address);
  }
  const sum = filled.reduce((a, r) => a + r.pct, 0);
  if (Math.abs(sum - 100) > 0.001) return `Shares must total 100% (now ${sum}%)`;
  return null;
}

/** Integer percents → bps. Last row absorbs rounding so the total is exactly 10_000. */
export function feeSharesToPayload(rows: FeeShareRow[]): FeeSharePayload[] {
  const filled = rows
    .map((r) => ({ address: r.address.trim(), pct: Number(r.pct) }))
    .filter((r) => r.address && r.pct > 0);
  const bps = filled.map((r) => Math.round(r.pct * 100));
  const sum = bps.reduce((a, b) => a + b, 0);
  if (bps.length) bps[bps.length - 1] += 10_000 - sum;
  return filled.map((r, i) => ({ pubkey: r.address, shareBps: bps[i] }));
}
