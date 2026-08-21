import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeployedCoin } from "../api/types";

interface DeployedState {
  coins: DeployedCoin[];
  addCoin: (coin: DeployedCoin) => void;
  updateCoin: (mint: string, patch: Partial<DeployedCoin>) => void;
  clear: () => void;
}

/** Mirrors the legacy `deployedCoins_v1` localStorage list. */
export const useDeployedStore = create<DeployedState>()(
  persist(
    (set) => ({
      coins: [],
      addCoin: (coin) =>
        set((s) => ({
          coins: [coin, ...s.coins.filter((c) => c.mint !== coin.mint)],
        })),
      updateCoin: (mint, patch) =>
        set((s) => ({
          coins: s.coins.map((c) => (c.mint === mint ? { ...c, ...patch } : c)),
        })),
      clear: () => set({ coins: [] }),
    }),
    { name: "deployedCoins_v1" }
  )
);
