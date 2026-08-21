import { createRequire } from "node:module";
import type { PublicKey, TransactionInstruction } from "@solana/web3.js";

/**
 * The SDK's ESM build named-imports `BN` from `@coral-xyz/anchor`, which Node
 * rejects. The CJS build (`require`) works, so load that instead.
 */
const require = createRequire(import.meta.url);
const sdk = require("@pump-fun/agent-payments-sdk") as {
  TOKEN_AGENT_PAYMENTS_MIN_RENT_EXEMPT_LAMPORTS: number;
  PumpAgentOffline: {
    load: (mint: PublicKey) => {
      create: (p: {
        authority: PublicKey;
        mint: PublicKey;
        agentAuthority: PublicKey;
        buybackBps: number;
      }) => Promise<TransactionInstruction>;
    };
  };
};

export const TOKEN_AGENT_PAYMENTS_MIN_RENT_EXEMPT_LAMPORTS =
  sdk.TOKEN_AGENT_PAYMENTS_MIN_RENT_EXEMPT_LAMPORTS;
export const PumpAgentOffline = sdk.PumpAgentOffline;
