import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PumpSdk,
  OnlinePumpSdk,
  getBuyTokenAmountFromSolAmount,
  getSellSolAmountFromTokenAmount,
} from "../lib/pumpSdk.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getConnection, resolveWalletKeypair, buildSignAndSend } from "../lib/solana.js";
import { fetchPumpGlobals } from "../lib/pumpCache.js";

export interface TradeBalance {
  tokenBalance: string;
  solBalance: string;
}

export async function getTradeBalance(mint: string, walletPubkey: string): Promise<TradeBalance> {
  const conn = getConnection();
  const mintPk = new PublicKey(mint);
  const userPk = new PublicKey(walletPubkey);

  const solP = conn.getBalance(userPk);

  let tokenBalance = "0";
  for (const prog of [TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID]) {
    try {
      const ata = getAssociatedTokenAddressSync(mintPk, userPk, true, prog);
      const info = await conn.getTokenAccountBalance(ata);
      tokenBalance = info.value.amount;
      break;
    } catch {
      // account missing under this program — try the next one
    }
  }

  const solInfo = await solP;
  return { tokenBalance, solBalance: (solInfo / 1e9).toFixed(6) };
}

export interface BuyParams {
  mint: string;
  walletPubkey?: string | null;
  userId: string;
  solAmount: number;
  slippage?: number;
}

export async function buyToken(p: BuyParams): Promise<{ signature: string; explorer: string }> {
  const conn = getConnection();
  const pumpSdk = new PumpSdk();
  const onlineSdk = new OnlinePumpSdk(conn);
  const userKey = await resolveWalletKeypair(p.userId, p.walletPubkey);
  if (!userKey) throw new Error("Wallet not found");

  const mintPk = new PublicKey(p.mint);
  const solLamports = new BN(Math.round(p.solAmount * 1e9));

  const [{ global, feeConfig }, buyState] = await Promise.all([
    fetchPumpGlobals(onlineSdk),
    onlineSdk.fetchBuyState(mintPk, userKey.publicKey, TOKEN_2022_PROGRAM_ID),
  ]);
  const { bondingCurveAccountInfo, bondingCurve, associatedUserAccountInfo } = buyState;

  const tokenAmount = getBuyTokenAmountFromSolAmount({
    global,
    feeConfig,
    mintSupply: bondingCurve.tokenTotalSupply,
    bondingCurve,
    amount: solLamports,
  });

  const instructions = await pumpSdk.buyInstructions({
    global,
    bondingCurveAccountInfo,
    bondingCurve,
    associatedUserAccountInfo,
    mint: mintPk,
    user: userKey.publicKey,
    solAmount: solLamports,
    amount: tokenAmount,
    slippage: (p.slippage ?? 15) / 100,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  });

  const sig = await buildSignAndSend(instructions, userKey.publicKey, [userKey]);
  return { signature: sig, explorer: `https://solscan.io/tx/${sig}` };
}

export interface SellParams {
  mint: string;
  walletPubkey?: string | null;
  userId: string;
  /** Raw token units; omit to sell the full balance. */
  tokenAmount?: string | null;
  slippage?: number;
}

export async function sellToken(p: SellParams): Promise<{ signature: string; explorer: string }> {
  const conn = getConnection();
  const pumpSdk = new PumpSdk();
  const onlineSdk = new OnlinePumpSdk(conn);
  const userKey = await resolveWalletKeypair(p.userId, p.walletPubkey);
  if (!userKey) throw new Error("Wallet not found");

  const mintPk = new PublicKey(p.mint);

  const [{ global, feeConfig }, sellState, amount] = await Promise.all([
    fetchPumpGlobals(onlineSdk),
    onlineSdk.fetchSellState(mintPk, userKey.publicKey, TOKEN_2022_PROGRAM_ID),
    p.tokenAmount
      ? Promise.resolve(new BN(String(p.tokenAmount)))
      : conn
          .getTokenAccountBalance(
            getAssociatedTokenAddressSync(mintPk, userKey.publicKey, true, TOKEN_2022_PROGRAM_ID)
          )
          .then((info) => new BN(info.value.amount)),
  ]);
  const { bondingCurveAccountInfo, bondingCurve } = sellState;

  const solAmount = getSellSolAmountFromTokenAmount({
    global,
    feeConfig,
    mintSupply: bondingCurve.tokenTotalSupply,
    bondingCurve,
    amount,
  });

  const instructions = await pumpSdk.sellInstructions({
    global,
    bondingCurveAccountInfo,
    bondingCurve,
    mint: mintPk,
    user: userKey.publicKey,
    amount,
    solAmount,
    slippage: (p.slippage ?? 15) / 100,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    mayhemMode: bondingCurve.isMayhemMode,
  });

  const sig = await buildSignAndSend(instructions, userKey.publicKey, [userKey]);
  return { signature: sig, explorer: `https://solscan.io/tx/${sig}` };
}
