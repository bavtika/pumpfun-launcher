import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  type AccountInfo,
  type TransactionInstruction,
} from "@solana/web3.js";
import bs58 from "bs58";
import BN from "bn.js";
import {
  PumpSdk,
  OnlinePumpSdk,
  getBuyTokenAmountFromSolAmount,
  newBondingCurve,
  BONDING_CURVE_NEW_SIZE,
  PUMP_PROGRAM_ID,
  type BondingCurve,
  type Global,
  type FeeConfig,
} from "@pump-fun/pump-sdk";
import { PumpAgentOffline, TOKEN_AGENT_PAYMENTS_MIN_RENT_EXEMPT_LAMPORTS } from "../lib/agentSdk.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { getConnection, resolveWalletKeypair, signV0Tx } from "../lib/solana.js";
import { readWallets } from "../lib/wallets.js";
import { fetchPumpGlobals } from "../lib/pumpCache.js";
import { uploadMetadataToPumpFun } from "./ipfs.js";
import { sendJitoBundle, buildJitoTipIx, waitForJitoBundle, JITO_MAX_TXS } from "./jito.js";

export interface BundleBuy {
  pubkey: string;
  amountSol: number;
}

export interface DeployParams {
  name: string;
  ticker: string;
  description?: string;
  buyAmountSol: number;
  customCA?: string | null;
  imageBuffer?: Buffer | null;
  imageType?: string;
  imageUrl?: string | null;
  social?: { twitter?: string; telegram?: string; website?: string };
  walletPubkey?: string | null;
  /** Owner of wallets used for signing (required). */
  userId: string;
  useJito?: boolean;
  jitoTipSol?: number;
  /** Extra wallets that buy in the same Jito bundle as create (excludes creator). */
  bundleBuys?: BundleBuy[];
  /** Redirect 100% of creator trading fees to traders (immutable at launch). */
  cashback?: boolean;
  /** Initialize a tokenized agent (requires initial buy > 0). */
  tokenizedAgent?: boolean;
  /** Agent buyback of agent revenue, in basis points (1–10000). Default 1000 = 10%. */
  buybackBps?: number;
  /** Creator-fee split. Sum of shareBps must be 10_000. Max 10 wallets. */
  feeShares?: FeeShare[];
  /** On-chain Mayhem mode (bonding curve + extra agent accounts). */
  mayhemMode?: boolean;
  /** Off-chain agent behavior: Classic = auto, Trigger = creator-prompted. */
  mayhemAgentMode?: "classic" | "trigger";
}

export interface FeeShare {
  pubkey: string;
  shareBps: number;
}


export interface DeployResult {
  mint: string;
  pumpUrl: string;
  /** Persistent CDN URL of the coin image (from pump.fun IPFS metadata). */
  imageUrl?: string | null;
  signature?: string;
  bundleId?: string;
}

const EMPTY_BC_INFO: AccountInfo<Buffer> = {
  executable: false,
  lamports: 1,
  owner: PUMP_PROGRAM_ID,
  data: Buffer.alloc(BONDING_CURVE_NEW_SIZE),
};

/** Rent for mint + bonding curve + metadata + ATAs on a pump.fun create. */
const CREATE_RENT_SOL = 0.02;
const ATA_RENT_SOL = 0.0021;
const AGENT_RENT_SOL = TOKEN_AGENT_PAYMENTS_MIN_RENT_EXEMPT_LAMPORTS / 1e9;
/** Rent for a 1024-byte sharing_config PDA (~0.008 SOL). */
const FEE_SHARE_RENT_SOL = 0.008;
/** Extra rent for Mayhem state PDA + token vault. */
const MAYHEM_RENT_SOL = 0.01;
/** pump.fun frontend: 270k create + 120k buy. Extra CU for agent / fee sharing / mayhem. */
const CREATE_BUY_CU = 390_000;
const AGENT_CU = 30_000;
const FEE_SHARE_CU = 150_000;
const MAYHEM_CU = 40_000;
const MAX_FEE_SHAREHOLDERS = 10;

function parseMayhemAgentMode(raw: unknown): "classic" | "trigger" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "trigger" || s === "manual") return "trigger";
  return "classic";
}

/**
 * Reads Agent / Cashback / Mayhem flags from the form `options` object (or JSON).
 * Slider percent 1–100 maps to buyback bps (pump default UI here is 10% = 1000 bps).
 */
export function resolveCreateFlags(
  options?: unknown,
  agentBuybackPct?: unknown,
  mayhemAgentMode?: unknown
): {
  cashback: boolean;
  tokenizedAgent: boolean;
  buybackBps: number;
  feeSharing: boolean;
  mayhem: boolean;
  mayhemAgentMode: "classic" | "trigger";
} {
  const o =
    options && typeof options === "object" && !Array.isArray(options)
      ? (options as Record<string, unknown>)
      : {};
  const pctRaw = agentBuybackPct ?? o.agentBuybackPct ?? o.buybackPct;
  const pct = Number(pctRaw);
  const clampedPct = Number.isFinite(pct) ? Math.min(100, Math.max(1, Math.round(pct))) : 10;
  return {
    cashback: Boolean(o.cashback),
    tokenizedAgent: Boolean(o.agent),
    buybackBps: clampedPct * 100,
    feeSharing: Boolean(o.feesharing),
    mayhem: Boolean(o.mayhem),
    mayhemAgentMode: parseMayhemAgentMode(mayhemAgentMode ?? o.mayhemAgentMode),
  };
}

/** Parse `{ pubkey, shareBps }[]`. If enabled but empty, 100% goes to fallbackPubkey (dev). */
export function parseFeeShares(
  raw: unknown,
  enabled: boolean,
  fallbackPubkey?: string | null
): FeeShare[] {
  if (!enabled) return [];
  if (typeof raw === "string" && raw.trim()) {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new Error("Invalid feeShares JSON");
    }
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    const pk = fallbackPubkey?.trim();
    if (!pk) throw new Error("Fee sharing requires at least one wallet");
    new PublicKey(pk);
    return [{ pubkey: pk, shareBps: 10_000 }];
  }
  if (raw.length > MAX_FEE_SHAREHOLDERS) {
    throw new Error(`Fee sharing allows at most ${MAX_FEE_SHAREHOLDERS} wallets`);
  }
  const out: FeeShare[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const e of raw) {
    if (!e || typeof e !== "object") throw new Error("Invalid feeShares entry");
    const o = e as { pubkey?: unknown; address?: unknown; shareBps?: unknown; pct?: unknown };
    const pubkey = String(o.pubkey ?? o.address ?? "").trim();
    if (!pubkey) throw new Error("Fee sharing wallet is empty");
    try {
      new PublicKey(pubkey);
    } catch {
      throw new Error(`Invalid fee sharing wallet ${pubkey.slice(0, 8)}…`);
    }
    if (seen.has(pubkey)) throw new Error("Duplicate fee-sharing wallets");
    seen.add(pubkey);
    let shareBps = Number(o.shareBps);
    if (!Number.isFinite(shareBps) && o.pct != null) shareBps = Math.round(Number(o.pct) * 100);
    if (!Number.isFinite(shareBps) || shareBps <= 0) {
      throw new Error("Each fee share must be > 0");
    }
    shareBps = Math.round(shareBps);
    total += shareBps;
    out.push({ pubkey, shareBps });
  }
  if (total !== 10_000) {
    throw new Error(`Fee shares must total 100% (got ${(total / 100).toFixed(2)}%)`);
  }
  return out;
}

function sol(lamports: number): string {
  return (lamports / 1e9).toFixed(4);
}

function applyBuy(curve: BondingCurve, solIn: BN, tokensOut: BN): BondingCurve {
  return {
    ...curve,
    virtualSolReserves: curve.virtualSolReserves.add(solIn),
    virtualTokenReserves: curve.virtualTokenReserves.sub(tokensOut),
    realSolReserves: curve.realSolReserves.add(solIn),
    realTokenReserves: curve.realTokenReserves.sub(tokensOut),
  };
}

async function buildExtraBuyIxs(
  pumpSdk: PumpSdk,
  global: Global,
  feeConfig: FeeConfig,
  mint: PublicKey,
  user: PublicKey,
  curve: BondingCurve,
  solLamports: BN
): Promise<{ ixs: TransactionInstruction[]; next: BondingCurve }> {
  const tokenAmount = getBuyTokenAmountFromSolAmount({
    global,
    feeConfig,
    mintSupply: curve.tokenTotalSupply,
    bondingCurve: curve,
    amount: solLamports,
  });
  const ixs = await pumpSdk.buyInstructions({
    global,
    bondingCurveAccountInfo: EMPTY_BC_INFO,
    bondingCurve: curve,
    associatedUserAccountInfo: null,
    mint,
    user,
    amount: tokenAmount,
    solAmount: solLamports,
    slippage: 15,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  });
  return { ixs, next: applyBuy(curve, solLamports, tokenAmount) };
}

/**
 * Shared deploy pipeline: metadata upload → create(+buy) instructions → Jito bundle or RPC.
 * Used by both /api/deploy and /api/vamp/deploy.
 */
export async function deployToken(p: DeployParams): Promise<DeployResult> {
  const conn = getConnection();
  const pumpSdk = new PumpSdk();
  const onlineSdk = new OnlinePumpSdk(conn);

  const [deployerKey, metaRes] = await Promise.all([
    resolveWalletKeypair(p.userId, p.walletPubkey),
    uploadMetadataToPumpFun({
      name: p.name,
      symbol: p.ticker,
      description: p.description,
      imageBuffer: p.imageBuffer,
      imageType: p.imageType,
      imageUrl: p.imageUrl,
      twitter: p.social?.twitter,
      telegram: p.social?.telegram,
      website: p.social?.website,
    }),
  ]);
  if (!deployerKey) {
    throw new Error(
      "No deployer wallet configured. Create/import a wallet or set DEPLOYER_PRIVKEY env var."
    );
  }

  const cashback = Boolean(p.cashback);
  const tokenizedAgent = Boolean(p.tokenizedAgent);
  const mayhemMode = Boolean(p.mayhemMode);
  const mayhemAgentMode = p.mayhemAgentMode === "trigger" ? "trigger" : "classic";
  const buybackBps = Math.min(10_000, Math.max(1, Math.round(p.buybackBps ?? 1000)));
  const feeShares = p.feeShares ?? [];
  const feeSharing = feeShares.length > 0;

  if (tokenizedAgent && p.buyAmountSol <= 0) {
    throw new Error("Tokenized Agent requires an initial buy > 0 SOL");
  }
  if (feeSharing && cashback) {
    throw new Error("Fee sharing cannot be combined with cashback coins");
  }

  const tipSol = p.useJito ? (p.jitoTipSol ?? 0.001) : 0;
  const needCreate =
    p.buyAmountSol +
    tipSol +
    CREATE_RENT_SOL +
    (tokenizedAgent ? AGENT_RENT_SOL : 0) +
    (feeSharing ? FEE_SHARE_RENT_SOL : 0) +
    (mayhemMode ? MAYHEM_RENT_SOL : 0);
  const deployerBal = await conn.getBalance(deployerKey.publicKey);
  if (deployerBal < needCreate * 1e9) {
    throw new Error(
      `Insufficient SOL on deployer ${deployerKey.publicKey.toBase58().slice(0, 8)}…: have ${sol(deployerBal)} SOL, need ~${needCreate.toFixed(3)} (create rent ~${CREATE_RENT_SOL} + buy ${p.buyAmountSol} + tip ${tipSol}${tokenizedAgent ? " + agent" : ""}${feeSharing ? " + fee sharing" : ""}${mayhemMode ? " + mayhem" : ""})`
    );
  }

  const metadataUri = metaRes.metadataUri;
  if (!metadataUri) throw new Error("Got no metadataUri from pump.fun IPFS");
  console.log(`[✓] Metadata URI: ${metadataUri}`);

  const imageUrl: string | null = typeof metaRes.image === "string" ? metaRes.image : null;

  const mintKp = p.customCA
    ? Keypair.fromSecretKey(bs58.decode(p.customCA))
    : Keypair.generate();
  const mint = mintKp.publicKey;

  const { global, feeConfig } = await fetchPumpGlobals(onlineSdk);

  const solLamports = new BN(Math.round(p.buyAmountSol * 1e9));
  const hasBuy = solLamports.gtn(0);
  let createIxs: TransactionInstruction[];

  if (hasBuy) {
    const tokenAmount = getBuyTokenAmountFromSolAmount({
      global,
      feeConfig,
      mintSupply: null,
      bondingCurve: null,
      amount: solLamports,
    });
    console.log(
      `[*] Building create+buy instructions (${p.buyAmountSol} SOL dev buy${cashback ? ", cashback" : ""}${mayhemMode ? `, mayhem ${mayhemAgentMode}` : ""})...`
    );
    createIxs = await pumpSdk.createV2AndBuyInstructions({
      global,
      mint,
      name: p.name,
      symbol: p.ticker,
      uri: metadataUri,
      creator: deployerKey.publicKey,
      user: deployerKey.publicKey,
      solAmount: solLamports,
      amount: tokenAmount,
      mayhemMode,
      cashback,
    });
  } else {
    console.log(
      `[*] Building create instruction (no dev buy${cashback ? ", cashback" : ""}${mayhemMode ? `, mayhem ${mayhemAgentMode}` : ""})...`
    );
    createIxs = [
      await pumpSdk.createV2Instruction({
        mint,
        name: p.name,
        symbol: p.ticker,
        uri: metadataUri,
        creator: deployerKey.publicKey,
        user: deployerKey.publicKey,
        mayhemMode,
        cashback,
      }),
    ];
  }

  if (tokenizedAgent) {
    const agentIx = await PumpAgentOffline.load(mint).create({
      authority: deployerKey.publicKey,
      mint,
      agentAuthority: deployerKey.publicKey,
      buybackBps,
    });
    createIxs.push(agentIx);
    console.log(`[*] Tokenized agent initialize: buyback ${buybackBps} bps`);
  }

  if (feeSharing) {
    const shareIxs = await pumpSdk.createSharingConfigWithSocialRecipients({
      creator: deployerKey.publicKey,
      mint,
      pool: null,
      newShareholders: feeShares.map((s) => ({
        address: new PublicKey(s.pubkey),
        shareBps: s.shareBps,
      })),
    });
    createIxs.push(...shareIxs);
    console.log(
      `[*] Fee sharing: ${feeShares.map((s) => `${s.pubkey.slice(0, 6)}… ${s.shareBps / 100}%`).join(", ")}`
    );
  }

  const extraCu =
    (tokenizedAgent ? AGENT_CU : 0) + (feeSharing ? FEE_SHARE_CU : 0) + (mayhemMode ? MAYHEM_CU : 0);
  if (extraCu > 0) {
    createIxs.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({ units: CREATE_BUY_CU + extraCu })
    );
  }

  // Extra bundle buys: create + up to 3 sniper txs + separate tip tx (Jito max 5).
  const creatorPk = deployerKey.publicKey.toBase58();
  const extraBuys = (p.bundleBuys ?? [])
    .filter((b) => b.pubkey !== creatorPk && b.amountSol > 0)
    .slice(0, JITO_MAX_TXS - 2);

  const stored = extraBuys.length ? await readWallets(p.userId) : [];
  const extraKeys = extraBuys
    .map((b) => {
      const w = stored.find((ww) => ww.pubkey === b.pubkey);
      if (!w) return null;
      return { buy: b, kp: Keypair.fromSecretKey(bs58.decode(w.secretKey)) };
    })
    .filter((x): x is { buy: BundleBuy; kp: Keypair } => Boolean(x));

  let curve: BondingCurve = {
    ...newBondingCurve(global),
    creator: deployerKey.publicKey,
    isMayhemMode: mayhemMode,
    isCashbackCoin: cashback,
  };
  if (hasBuy) {
    const creatorTokens = getBuyTokenAmountFromSolAmount({
      global,
      feeConfig,
      mintSupply: null,
      bondingCurve: null,
      amount: solLamports,
    });
    curve = applyBuy(curve, solLamports, creatorTokens);
  }

  const extraIxs: { kp: Keypair; ixs: TransactionInstruction[]; amountSol: number }[] = [];
  for (const { buy, kp } of extraKeys) {
    const sol = new BN(Math.round(buy.amountSol * 1e9));
    const built = await buildExtraBuyIxs(
      pumpSdk,
      global,
      feeConfig,
      mint,
      kp.publicKey,
      curve,
      sol
    );
    extraIxs.push({ kp, ixs: built.ixs, amountSol: buy.amountSol });
    curve = built.next;
  }

  for (const extra of extraIxs) {
    const need = extra.amountSol + ATA_RENT_SOL;
    const bal = await conn.getBalance(extra.kp.publicKey);
    if (bal < need * 1e9) {
      throw new Error(
        `Insufficient SOL on bundle wallet ${extra.kp.publicKey.toBase58().slice(0, 8)}…: have ${sol(bal)} SOL, need ~${need.toFixed(3)}`
      );
    }
  }

  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tipIx = p.useJito ? await buildJitoTipIx(deployerKey.publicKey, p.jitoTipSol ?? 0.001) : null;

  const signedTxs = [
    signV0Tx(deployerKey.publicKey, createIxs, [mintKp, deployerKey], blockhash),
    ...extraIxs.map((extra) => signV0Tx(extra.kp.publicKey, extra.ixs, [extra.kp], blockhash)),
  ];
  // Jito searchers expect a dedicated last tip tx — stuffing the transfer into create often drops the bundle.
  if (tipIx) {
    signedTxs.push(signV0Tx(deployerKey.publicKey, [tipIx], [deployerKey], blockhash));
  }

  const mintAddr = mint.toBase58();
  const pumpUrl = `https://pump.fun/${mintAddr}`;

  if (p.useJito) {
    try {
      const bundleId = await sendJitoBundle(signedTxs);
      console.log(`[*] Jito bundle submitted: ${bundleId} | mint=${mintAddr} | txs=${signedTxs.length}`);
      const landed = await waitForJitoBundle(bundleId, 5000);
      if (landed) {
        console.log(`✅ Jito bundle landed: ${bundleId} | mint=${mintAddr}`);
        return { bundleId, mint: mintAddr, pumpUrl, imageUrl };
      }
      console.warn(`[~] Jito bundle did not land in time, falling back to RPC`);
    } catch (e) {
      console.warn(`[~] Jito unavailable, falling back to RPC: ${e instanceof Error ? e.message : e}`);
    }
  }

  const { blockhash: bh2 } = await conn.getLatestBlockhash("confirmed");
  const rpcCreate = signV0Tx(
    deployerKey.publicKey,
    extraIxs.length === 0
      ? [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 }), ...createIxs]
      : createIxs,
    [mintKp, deployerKey],
    bh2
  );
  try {
    const sig = await conn.sendRawTransaction(rpcCreate.serialize(), {
      skipPreflight: true,
      maxRetries: 5,
    });
    const conf = await conn.confirmTransaction(sig, "confirmed");
    if (conf.value.err) {
      const msg = JSON.stringify(conf.value.err);
      const hint = msg.includes('"Custom":1')
        ? " (likely insufficient SOL for create rent ~0.02 + buy + Jito tip)"
        : "";
      throw new Error(`Create tx failed: ${msg}${hint}`);
    }
    await Promise.all(
      extraIxs.map(({ kp, ixs }) =>
        conn.sendRawTransaction(signV0Tx(kp.publicKey, ixs, [kp], bh2).serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        })
      )
    );
    console.log(`✅ Token deployed${extraIxs.length ? " (+bundle buys)" : ""}: mint=${mintAddr} tx=${sig}`);
    return { signature: sig, mint: mintAddr, pumpUrl, imageUrl };
  } catch (e) {
    // Jito may have landed after the poll window; same mint then fails on RPC.
    const info = await conn.getAccountInfo(mint).catch(() => null);
    if (info) {
      console.log(`✅ Mint already on-chain (likely late Jito land): ${mintAddr}`);
      return { mint: mintAddr, pumpUrl, imageUrl };
    }
    throw e;
  }
}
