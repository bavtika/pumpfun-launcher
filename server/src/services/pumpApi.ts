import { pumpCoinEndpoints } from "../lib/config.js";

export interface PumpCoin {
  name?: string;
  symbol?: string;
  description?: string;
  image_uri?: string;
  usd_market_cap?: number;
  market_cap?: number;
  [key: string]: unknown;
}

/** Race pump.fun coin endpoints; first OK response wins. */
export async function fetchPumpCoin(mint: string): Promise<PumpCoin | null> {
  const urls = pumpCoinEndpoints(mint);
  try {
    return await Promise.any(
      urls.map(async (url) => {
        const r = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4_000),
        });
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as PumpCoin;
      })
    );
  } catch {
    return null;
  }
}

export async function fetchMarketCap(mint: string): Promise<number | null> {
  try {
    const coin = await fetchPumpCoin(mint);
    if (!coin) return null;
    return coin.usd_market_cap ?? coin.market_cap ?? null;
  } catch {
    return null;
  }
}
