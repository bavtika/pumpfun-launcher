import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

function detectRootDir(): string {
  try {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  } catch {
    return process.cwd();
  }
}

export const ROOT_DIR = detectRootDir();

function loadDotenv() {
  try {
    const envPath = path.join(ROOT_DIR, ".env");
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // Vercel injects env vars; a missing .env file is expected.
  }
}
loadDotenv();

export const PORT = Number(process.env.PORT) || 3000;
export const RPC_URL = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
export const DEPLOYER_PRIVKEY = process.env.DEPLOYER_PRIVKEY || null;

export const DATABASE_URL = process.env.DATABASE_URL || "";
/** Shared gate on login/register. The app is not public without this. */
export const SITE_PASSWORD = process.env.SITE_PASSWORD || "";
/** 64-hex AES key, or a passphrase ≥16 chars used to wrap wallet secrets at rest. */
export const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || "";

// RunPod serverless endpoint for GPU vanity address generation (4-6 char patterns).
export const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || null;
export const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || null;

export const CLIENT_DIST = existsSync(path.join(ROOT_DIR, "dist", "index.html"))
  ? path.join(ROOT_DIR, "dist")
  : path.join(ROOT_DIR, "client", "dist");

export const PUMP_IPFS_URL = "https://pump.fun/api/ipfs";

export const pumpCoinEndpoints = (mint: string): string[] => [
  `https://frontend-api.pump.fun/coins/${mint}`,
  `https://frontend-api-v3.pump.fun/coins/${mint}`,
  `https://client-api-2.pump.fun/coins/${mint}`,
];

// Current Jito block-engine endpoints (the legacy *.jito.labs.io domain is dead).
export const JITO_BUNDLE_ENDPOINTS = [
  "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

/**
 * Official Jito tip accounts, verified 2026-08-19 against the live block engine
 * (getTipAccounts RPC). Fallback only — jito.ts re-fetches the live list.
 */
export const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

export const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
