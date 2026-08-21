import type {
  AuthUser,
  ClaimRewardsResult,
  CreatorRewardsResult,
  DeployOptions,
  DeployResult,
  McapResult,
  PublicWallet,
  TradeBalance,
  TxResult,
  VampDeployResult,
  VampInfo,
  VanityMatchType,
  VanityStatusResult,
} from "./types";
import { useAuthStore } from "../stores/auth";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) {
    useAuthStore.getState().clear();
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),

  me: () => request<{ user: AuthUser | null }>("/api/auth/me"),

  login: (username: string, password: string, sitePassword: string) =>
    request<{ user: AuthUser }>("/api/auth/login", json("POST", { username, password, sitePassword })),

  register: (username: string, password: string, sitePassword: string) =>
    request<{ user: AuthUser }>("/api/auth/register", json("POST", { username, password, sitePassword })),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", json("POST", {})),

  getBalance: (pubkey: string) =>
    request<{ sol: number }>(`/api/balance/${encodeURIComponent(pubkey)}`),

  // ── Wallets ────────────────────────────────────────────
  getWallets: () => request<PublicWallet[]>("/api/wallets"),

  createWallets: (count: number) =>
    request<PublicWallet[]>("/api/wallets", json("POST", { count })),

  importWallet: (secretKey: string, name: string) =>
    request<PublicWallet>("/api/wallets/import", json("POST", { secretKey, name })),

  deleteWallet: (pubkey: string) =>
    request<{ ok: boolean }>(`/api/wallets/${encodeURIComponent(pubkey)}`, { method: "DELETE" }),

  renameWallet: (pubkey: string, name: string) =>
    request<{ ok: boolean }>(`/api/wallets/${encodeURIComponent(pubkey)}/name`, json("PATCH", { name })),

  setDevWallet: (pubkey: string) =>
    request<{ ok: boolean }>(`/api/wallets/${encodeURIComponent(pubkey)}/setdev`, { method: "PATCH" }),

  fundWallet: (from: string, to: string, amount: number | string) =>
    request<TxResult>("/api/wallets/fund", json("POST", { from, to, amount })),

  exportWallet: (pubkey: string) =>
    request<{ secretKey: string; pubkey: string }>(
      `/api/wallets/export/${encodeURIComponent(pubkey)}`
    ),

  // ── Deploy ─────────────────────────────────────────────
  deploy: (form: FormData) =>
    request<DeployResult>("/api/deploy", { method: "POST", body: form }),

  // ── Trade ──────────────────────────────────────────────
  tradeBalance: (mint: string, walletPubkey: string) =>
    request<TradeBalance>(
      `/api/trade/balance?mint=${encodeURIComponent(mint)}&walletPubkey=${encodeURIComponent(walletPubkey)}`
    ),

  tradeBuy: (p: { mint: string; walletPubkey: string; solAmount: number; slippage: number }) =>
    request<TxResult>("/api/trade/buy", json("POST", p)),

  tradeSell: (p: {
    mint: string;
    walletPubkey: string;
    tokenAmount?: string;
    slippage: number;
  }) => request<TxResult>("/api/trade/sell", json("POST", p)),

  // ── Vanity CA (GPU via RunPod) ─────────────────────────
  vanityStart: (pattern: string, match: VanityMatchType) =>
    request<{ jobId: string }>("/api/vanity", json("POST", { pattern, match })),

  vanityStatus: (jobId: string) =>
    request<VanityStatusResult>(`/api/vanity/${encodeURIComponent(jobId)}`),

  vanityCancel: (jobId: string) =>
    request<{ ok: boolean }>(`/api/vanity/${encodeURIComponent(jobId)}`, { method: "DELETE" }),

  // ── Misc ───────────────────────────────────────────────
  getMcap: (mint: string) => request<McapResult>(`/api/mcap/${encodeURIComponent(mint)}`),

  getVampInfo: (mint: string) => request<VampInfo>(`/api/vamp?mint=${encodeURIComponent(mint)}`),

  vampDeploy: (p: {
    sourceMint: string;
    walletPublicKey: string | null;
    buyAmount: number;
    options: DeployOptions;
    agentBuybackPct?: number;
    mayhemAgentMode?: "classic" | "trigger";
    feeShares?: { pubkey: string; shareBps: number }[];
  }) => request<VampDeployResult>("/api/vamp/deploy", json("POST", p)),

  // ── Earnings ───────────────────────────────────────────
  getCreatorRewards: () => request<CreatorRewardsResult>("/api/earnings/creator"),

  claimCreatorRewards: (walletPubkey: string) =>
    request<ClaimRewardsResult>("/api/earnings/creator/claim", json("POST", { walletPubkey })),
};
