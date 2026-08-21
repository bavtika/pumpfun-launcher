import type { OnlinePumpSdkInstance as OnlinePumpSdk } from "./pumpSdk.js";

const TTL_MS = 8_000;

type PumpGlobals = {
  global: Awaited<ReturnType<OnlinePumpSdk["fetchGlobal"]>>;
  feeConfig: Awaited<ReturnType<OnlinePumpSdk["fetchFeeConfig"]>>;
};

let cache: { value: PumpGlobals; at: number } | null = null;
let inflight: Promise<PumpGlobals> | null = null;

/** Short-lived cache of pump.fun global + fee config (shared across parallel deploys/trades). */
export async function fetchPumpGlobals(sdk: OnlinePumpSdk): Promise<PumpGlobals> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  if (inflight) return inflight;

  inflight = Promise.all([sdk.fetchGlobal(), sdk.fetchFeeConfig()])
    .then(([global, feeConfig]) => {
      const value = { global, feeConfig };
      cache = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
