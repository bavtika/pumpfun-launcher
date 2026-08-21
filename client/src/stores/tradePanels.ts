import { create } from "zustand";

export interface TradePanelData {
  id: number;
  mint: string;
  walletPubkey: string | null;
  coinName: string;
  coinTicker: string;
  imageUrl: string;
  pumpUrl: string;
  delayMs: number;
  /** becomes true after delayMs elapses (staggered entrance) */
  shown: boolean;
}

interface TradePanelsState {
  panels: TradePanelData[];
  open: (p: Omit<TradePanelData, "id" | "shown">) => void;
  markShown: (id: number) => void;
  close: (id: number) => void;
}

let nextId = 1;

export const useTradePanelsStore = create<TradePanelsState>((set) => ({
  panels: [],

  open: (p) => {
    const id = nextId++;
    set((s) => ({ panels: [...s.panels, { ...p, id, shown: p.delayMs <= 0 }] }));
    if (p.delayMs > 0) {
      setTimeout(() => {
        useTradePanelsStore.getState().markShown(id);
      }, p.delayMs);
    }
  },

  markShown: (id) =>
    set((s) => ({ panels: s.panels.map((p) => (p.id === id ? { ...p, shown: true } : p)) })),

  close: (id) => set((s) => ({ panels: s.panels.filter((p) => p.id !== id) })),
}));
