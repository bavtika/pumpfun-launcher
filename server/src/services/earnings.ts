import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  type AccountInfo,
} from "@solana/web3.js";
import {
  AccountLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  OnlinePumpSdk,
  ammCreatorVaultPda,
  creatorVaultPda,
} from "@pump-fun/pump-sdk";
import { getConnection, resolveWalletKeypair, signV0Tx } from "../lib/solana.js";
import { readWallets } from "../lib/walletStore.js";

const CLAIM_CU = 300_000;

function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

function ammVaultAta(creator: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(
    NATIVE_MINT,
    ammCreatorVaultPda(creator),
    true,
    TOKEN_PROGRAM_ID
  );
}

function tokenAmountLamports(info: AccountInfo<Buffer> | null): number {
  if (!info || info.data.length < AccountLayout.span) return 0;
  try {
    return Number(AccountLayout.decode(info.data).amount);
  } catch {
    return 0;
  }
}

async function claimableForAccounts(
  conn: ReturnType<typeof getConnection>,
  pumpInfo: AccountInfo<Buffer> | null,
  ammInfo: AccountInfo<Buffer> | null,
  rentByLen: Map<number, number>
): Promise<{ pump: number; amm: number }> {
  let pump = 0;
  if (pumpInfo) {
    const len = pumpInfo.data.length;
    let rent = rentByLen.get(len);
    if (rent === undefined) {
      rent = await conn.getMinimumBalanceForRentExemption(len);
      rentByLen.set(len, rent);
    }
    pump = Math.max(0, pumpInfo.lamports - rent);
  }
  return { pump, amm: tokenAmountLamports(ammInfo) };
}

export async function claimCreatorRewards(
  userId: string,
  walletPubkey: string
): Promise<{ signature: string; explorer: string; claimedSol: number }> {
  const stored = await readWallets(userId);
  if (!stored.some((w) => w.pubkey === walletPubkey)) {
    throw Object.assign(new Error("Wallet not found"), { status: 404 });
  }

  const conn = getConnection();
  const creator = new PublicKey(walletPubkey);
  const [pumpInfo, ammInfo] = await conn.getMultipleAccountsInfo([
    creatorVaultPda(creator),
    ammVaultAta(creator),
  ]);
  const { pump, amm } = await claimableForAccounts(conn, pumpInfo, ammInfo, new Map());
  const claimable = pump + amm;
  if (claimable <= 0) {
    throw Object.assign(new Error("Nothing to claim"), { status: 400 });
  }

  const userKey = await resolveWalletKeypair(userId, walletPubkey);
  if (!userKey) throw Object.assign(new Error("Wallet not found"), { status: 404 });

  const sdk = new OnlinePumpSdk(conn);
  const collected = await sdk.collectCoinCreatorFeeInstructions(creator);
  const pumpIx = collected[0];
  const ammIxs = collected.slice(1);
  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: CLAIM_CU }),
    ...(pump > 0 && pumpIx ? [pumpIx] : []),
    ...(amm > 0 ? ammIxs : []),
  ];

  if (ixs.length < 2) {
    throw Object.assign(new Error("Nothing to claim"), { status: 400 });
  }

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = signV0Tx(userKey.publicKey, ixs, [userKey], blockhash);
  const signature = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    maxRetries: 3,
  });
  const conf = await conn.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  if (conf.value.err) {
    throw new Error(`Claim failed: ${JSON.stringify(conf.value.err)}`);
  }

  console.log(
    `💰 Claimed ${lamportsToSol(claimable).toFixed(6)} SOL creator rewards → ${walletPubkey.slice(0, 8)}… | tx: ${signature}`
  );

  return {
    signature,
    explorer: `https://solscan.io/tx/${signature}`,
    claimedSol: lamportsToSol(claimable),
  };
}
