export function truncateAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-6)}`;
}

export function truncateMiddle(addr: string, head = 10, tail = 6): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function formatSol(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

/** Compact SOL amount for creator-fee dust (keeps extra digits, strips trailing zeros). */
export function formatRewardSol(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value === 0) return "0";
  const digits = value >= 1 ? 4 : 6;
  return String(Number(value.toFixed(digits)));
}

export function formatMcap(mcap: number | null | undefined): string {
  if (mcap === null || mcap === undefined) return "—";
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(2)}M`;
  if (mcap >= 1_000) return `$${(mcap / 1_000).toFixed(1)}K`;
  return `$${mcap.toFixed(2)}`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
