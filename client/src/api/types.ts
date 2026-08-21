export interface PublicWallet {
  id: number;
  name: string;
  pubkey: string;
  isDev: boolean;
  createdAt: string;
  balance?: number | null;
}

export interface DeployOptions {
  bundle: boolean;
  snipe: boolean;
  multideploy: boolean;
  farmsnipers: boolean;
  feesharing: boolean;
  mayhem: boolean;
  cashback: boolean;
  agent: boolean;
}

export interface SnipeConfig {
  amount: number;
  slippage: number;
  priority: number;
}

export interface FeeShareRow {
  address: string;
  pct: number;
}

export interface DeployResult {
  mint: string;
  pumpUrl: string;
  imageUrl?: string | null;
  signature?: string;
  bundleId?: string;
}

export interface TradeBalance {
  tokenBalance: string;
  solBalance: string;
}

export interface TxResult {
  signature: string;
  explorer: string;
}

export interface McapResult {
  mcap: number | null;
}

// ── Vanity CA ──────────────────────────────────────────
export type VanityMatchType = "prefix" | "suffix";

export interface VanityStatusResult {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  address?: string;
  secretKey?: string;
  error?: string;
}

export interface VampInfo {
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
}

export interface VampDeployResult extends DeployResult {
  name: string;
  ticker: string;
  imageUrl: string;
}

export interface DeployedCoin {
  mint: string;
  name: string;
  ticker: string;
  imageUrl: string | null;
  pumpUrl: string;
  ts: number;
}

export type ImageTab = "upload" | "web" | "ascii";

export type MayhemAgentMode = "classic" | "trigger";

export type PageTab = "feed" | "wallets" | "earnings" | "settings";

export interface AuthUser {
  id: string;
  username: string;
}

export interface CreatorRewardRow {
  pubkey: string;
  name: string;
  isDev: boolean;
  balance: number | null;
  claimableSol: number;
}

export interface CreatorRewardsResult {
  wallets: CreatorRewardRow[];
  totalClaimableSol: number;
}

export interface ClaimRewardsResult {
  signature: string;
  explorer: string;
  claimedSol: number;
}
