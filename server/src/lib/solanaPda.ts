import { createHash } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519";
import bs58 from "bs58";

const PDA_MARKER = Buffer.from("ProgramDerivedAddress");

export const PUMP_PROGRAM_ID = bs58.decode("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
export const PUMP_AMM_PROGRAM_ID = bs58.decode("pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA");
export const TOKEN_PROGRAM_ID = bs58.decode("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = bs58.decode("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const NATIVE_MINT = bs58.decode("So11111111111111111111111111111111111111112");

function isOnCurve(bytes: Uint8Array): boolean {
  try {
    ed25519.Point.fromBytes(bytes);
    return true;
  } catch {
    return false;
  }
}

export function findProgramAddress(seeds: Uint8Array[], programId: Uint8Array): Uint8Array {
  for (let bump = 255; bump >= 0; bump--) {
    const hash = createHash("sha256");
    for (const s of seeds) hash.update(s);
    hash.update(Uint8Array.of(bump));
    hash.update(programId);
    hash.update(PDA_MARKER);
    const digest = hash.digest();
    if (!isOnCurve(digest)) return new Uint8Array(digest);
  }
  throw new Error("Unable to find a viable program address nonce");
}

export function pdaBase58(seeds: Uint8Array[], programId: Uint8Array): string {
  return bs58.encode(findProgramAddress(seeds, programId));
}

export function isBase58Pubkey(s: unknown): s is string {
  if (typeof s !== "string" || !s) return false;
  try {
    return bs58.decode(s).length === 32;
  } catch {
    return false;
  }
}

/** pump.fun bonding-curve creator vault PDA. */
export function creatorVaultAddress(creator: Uint8Array): string {
  return pdaBase58([Buffer.from("creator-vault"), creator], PUMP_PROGRAM_ID);
}

/** pump.fun AMM creator vault authority PDA. */
export function ammCreatorVaultAddress(creator: Uint8Array): string {
  return pdaBase58([Buffer.from("creator_vault"), creator], PUMP_AMM_PROGRAM_ID);
}

/** WSOL ATA owned by the AMM creator vault (allowOwnerOffCurve). */
export function ammCreatorVaultAta(creator: Uint8Array): string {
  const vault = findProgramAddress([Buffer.from("creator_vault"), creator], PUMP_AMM_PROGRAM_ID);
  return pdaBase58([vault, TOKEN_PROGRAM_ID, NATIVE_MINT], ASSOCIATED_TOKEN_PROGRAM_ID);
}
