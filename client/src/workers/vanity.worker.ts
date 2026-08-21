import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";

export type VanityMatch = "prefix" | "suffix";

export interface VanityWorkerIn {
  type: "start" | "stop";
  pattern?: string;
  match?: VanityMatch;
}

export interface VanityWorkerOut {
  type: "progress" | "found";
  attempts: number; // delta for progress, total for found
  address?: string;
  secretKey?: string;
}

let running = false;

function grind(pattern: string, match: VanityMatch) {
  const seed = new Uint8Array(32);
  const check = match === "prefix" ? "startsWith" : "endsWith";
  let attempts = 0;
  let lastReport = performance.now();

  while (running) {
    crypto.getRandomValues(seed);
    const pub = ed25519.getPublicKey(seed);
    const addr = bs58.encode(pub);
    attempts++;

    if (addr[check](pattern)) {
      const secret = new Uint8Array(64);
      secret.set(seed);
      secret.set(pub, 32);
      postMessage({
        type: "found",
        attempts,
        address: addr,
        secretKey: bs58.encode(secret),
      } satisfies VanityWorkerOut);
      return;
    }

    const now = performance.now();
    if (now - lastReport >= 500) {
      postMessage({ type: "progress", attempts } satisfies VanityWorkerOut);
      attempts = 0;
      lastReport = now;
    }
  }
}

self.onmessage = (e: MessageEvent<VanityWorkerIn>) => {
  const msg = e.data;
  if (msg.type === "stop") {
    running = false;
    return;
  }
  if (msg.type === "start" && msg.pattern && msg.match) {
    running = true;
    grind(msg.pattern, msg.match);
    running = false;
  }
};
