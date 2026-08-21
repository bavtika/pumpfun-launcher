import { RPC_URL } from "./config.js";

interface RpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

export interface RpcAccount {
  lamports: number;
  data: [string, string];
  owner: string;
  executable: boolean;
  rentEpoch: number;
  space?: number;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`RPC ${method} failed: HTTP ${res.status}`);
  }
  const body = (await res.json()) as RpcResponse<T>;
  if (body.error) {
    throw new Error(`RPC ${method} failed: ${body.error.message}`);
  }
  if (body.result === undefined) {
    throw new Error(`RPC ${method} returned no result`);
  }
  return body.result;
}

export async function rpcGetMultipleAccounts(
  pubkeys: string[]
): Promise<(RpcAccount | null)[]> {
  if (pubkeys.length === 0) return [];
  const result = await rpc<{ value: (RpcAccount | null)[] }>("getMultipleAccounts", [
    pubkeys,
    { encoding: "base64", commitment: "confirmed" },
  ]);
  return result.value;
}

export async function rpcMinRentExempt(dataLen: number): Promise<number> {
  return rpc<number>("getMinimumBalanceForRentExemption", [dataLen]);
}
