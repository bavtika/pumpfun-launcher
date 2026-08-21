/**
 * Load @pump-fun/pump-sdk via CJS. The package's ESM build fails named-imports
 * under Vercel's Node ESM loader (same class of bug as agent-payments-sdk).
 */
import { createRequire } from "node:module";
import type {
  BondingCurve,
  FeeConfig,
  Global,
  OnlinePumpSdk as OnlinePumpSdkType,
  PumpSdk as PumpSdkType,
} from "@pump-fun/pump-sdk";
import type { Connection, PublicKey } from "@solana/web3.js";
import type BN from "bn.js";

const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/pump-sdk") as {
  PumpSdk: new () => PumpSdkType;
  OnlinePumpSdk: new (connection: Connection) => OnlinePumpSdkType;
  getBuyTokenAmountFromSolAmount: (args: Record<string, unknown>) => BN;
  getSellSolAmountFromTokenAmount: (args: Record<string, unknown>) => BN;
  newBondingCurve: (global: Global, quoteMint?: PublicKey) => BondingCurve;
  PUMP_PROGRAM_ID: PublicKey;
  ammCreatorVaultPda: (creator: PublicKey) => PublicKey;
  creatorVaultPda: (creator: PublicKey) => PublicKey;
};

export const PumpSdk = sdk.PumpSdk;
export const OnlinePumpSdk = sdk.OnlinePumpSdk;
export const getBuyTokenAmountFromSolAmount = sdk.getBuyTokenAmountFromSolAmount;
export const getSellSolAmountFromTokenAmount = sdk.getSellSolAmountFromTokenAmount;
export const newBondingCurve = sdk.newBondingCurve;
export const PUMP_PROGRAM_ID = sdk.PUMP_PROGRAM_ID;
export const ammCreatorVaultPda = sdk.ammCreatorVaultPda;
export const creatorVaultPda = sdk.creatorVaultPda;

export type { BondingCurve, FeeConfig, Global };
export type PumpSdkInstance = InstanceType<typeof PumpSdk>;
export type OnlinePumpSdkInstance = InstanceType<typeof OnlinePumpSdk>;
