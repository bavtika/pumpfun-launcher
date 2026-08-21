import bs58 from "bs58";
import { publicWallet, readWallets } from "../lib/walletStore.js";
import {
  ammCreatorVaultAta,
  creatorVaultAddress,
  isBase58Pubkey,
} from "../lib/solanaPda.js";
import { rpcGetMultipleAccounts, rpcMinRentExempt, type RpcAccount } from "../lib/solanaRpc.js";

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

const LAMPORTS_PER_SOL = 1_000_000_000;
const TOKEN_ACCOUNT_LEN = 165;

function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

function accountData(info: RpcAccount | null): Buffer | null {
  if (!info?.data?.[0]) return null;
  try {
    return Buffer.from(info.data[0], info.data[1] === "base64" ? "base64" : "utf8");
  } catch {
    return null;
  }
}

function tokenAmountLamports(info: RpcAccount | null): number {
  const data = accountData(info);
  if (!data || data.length < 72) return 0;
  return Number(data.readBigUInt64LE(64));
}

async function claimableForAccounts(
  pumpInfo: RpcAccount | null,
  ammInfo: RpcAccount | null,
  rentByLen: Map<number, number>
): Promise<{ pump: number; amm: number }> {
  let pump = 0;
  if (pumpInfo) {
    const data = accountData(pumpInfo);
    const len = data?.length ?? pumpInfo.space ?? 0;
    let rent = rentByLen.get(len);
    if (rent === undefined) {
      rent = await rpcMinRentExempt(len);
      rentByLen.set(len, rent);
    }
    pump = Math.max(0, pumpInfo.lamports - rent);
  }
  return { pump, amm: tokenAmountLamports(ammInfo) };
}

/** Scan stored wallets for claimable pump.fun creator fees (bonding curve + AMM). */
export async function listCreatorRewards(userId: string): Promise<CreatorRewardsResult> {
  const stored = await readWallets(userId);
  if (stored.length === 0) {
    return { wallets: [], totalClaimableSol: 0 };
  }

  const keys: string[] = [];
  for (const w of stored) {
    if (!isBase58Pubkey(w.pubkey)) continue;
    const creator = bs58.decode(w.pubkey);
    keys.push(creatorVaultAddress(creator), ammCreatorVaultAta(creator), w.pubkey);
  }

  const infos = await rpcGetMultipleAccounts(keys);
  const rentByLen = new Map<number, number>([[TOKEN_ACCOUNT_LEN, 2_039_280]]);
  const wallets: CreatorRewardRow[] = [];
  let totalLamports = 0;
  let infoIdx = 0;

  for (const w of stored) {
    if (!isBase58Pubkey(w.pubkey)) {
      wallets.push({ ...publicWallet(w), balance: null, claimableSol: 0 });
      continue;
    }
    const pumpInfo = infos[infoIdx] ?? null;
    const ammInfo = infos[infoIdx + 1] ?? null;
    const walletInfo = infos[infoIdx + 2] ?? null;
    infoIdx += 3;

    const { pump, amm } = await claimableForAccounts(pumpInfo, ammInfo, rentByLen);
    const claimable = pump + amm;
    totalLamports += claimable;
    wallets.push({
      ...publicWallet(w),
      balance: walletInfo ? lamportsToSol(walletInfo.lamports) : 0,
      claimableSol: lamportsToSol(claimable),
    });
  }

  return { wallets, totalClaimableSol: lamportsToSol(totalLamports) };
}
