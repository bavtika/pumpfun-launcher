import { create } from "zustand";
import type { DeployOptions, FeeShareRow, ImageTab, MayhemAgentMode, PublicWallet, SnipeConfig } from "../api/types";

export const NAME_MAX = 30;
export const TICKER_MAX = 10;
export const DESC_MAX = 200;

/**
 * Resolves the effective wallet pubkey per multideploy clone.
 * Explicit picks win; clones without a valid pick get the first wallet
 * not already taken by another clone, so assignments never duplicate.
 */
export function resolveCloneWalletPubkeys(
  wallets: PublicWallet[],
  picks: Record<number, string>,
  count: number
): (string | null)[] {
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => {
    const explicit = picks[i];
    if (explicit && !used.has(explicit) && wallets.some((w) => w.pubkey === explicit)) {
      used.add(explicit);
      return explicit;
    }
    const free = wallets.find((w) => !used.has(w.pubkey));
    if (free) {
      used.add(free.pubkey);
      return free.pubkey;
    }
    return null;
  });
}

interface FormState {
  name: string;
  ticker: string;
  description: string;

  imageTab: ImageTab;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  webImageUrl: string;
  /** confirmed web image to use in deploy */
  imageUrl: string | null;
  asciiArt: string;

  twitter: string;
  telegram: string;
  website: string;

  customCAEnabled: boolean;
  customCASecret: string;

  options: DeployOptions;
  snipe: SnipeConfig;
  /** multi-deploy clone count (from the multideploy popover slider) */
  cloneCount: number;
  /** multi-deploy wallet per clone index (falls back to wallets[i] when unset) */
  cloneWallets: Record<number, string>;
  /** per-clone buy amount for multideploy */
  cloneAmounts: Record<number, number>;
  /** per-wallet buy amount for bundle extra buys */
  bundleAmounts: Record<string, number>;
  /** tokenized-agent buyback percent (1–100) of agent revenue */
  agentBuybackPct: number;
  /** Mayhem agent: Classic = auto random walk, Trigger = creator-prompted */
  mayhemAgentMode: MayhemAgentMode;
  /** creator-fee split: wallet address + integer percent (must total 100) */
  feeShares: FeeShareRow[];
  /** tradePanelToggle — open trade panel automatically after deploy */
  tradePanelEnabled: boolean;

  selectedAmount: number;
  customAmount: number | null;

  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleOption: (key: keyof DeployOptions) => void;
  setOption: (key: keyof DeployOptions, value: boolean) => void;
  setSnipeField: <K extends keyof SnipeConfig>(key: K, value: SnipeConfig[K]) => void;
  setImageFile: (file: File | null) => void;
  effectiveAmount: () => number;
}

const defaultOptions: DeployOptions = {
  bundle: false,
  snipe: false,
  multideploy: false,
  farmsnipers: false,
  feesharing: false,
  mayhem: false,
  cashback: false,
  agent: false,
};

export const useFormStore = create<FormState>((set, get) => ({
  name: "",
  ticker: "",
  description: "",

  imageTab: "upload",
  imageFile: null,
  imagePreviewUrl: null,
  webImageUrl: "",
  imageUrl: null,
  asciiArt: "",

  twitter: "",
  telegram: "",
  website: "",

  customCAEnabled: false,
  customCASecret: "",

  options: { ...defaultOptions },
  snipe: { amount: 0.1, slippage: 15, priority: 0.0005 },
  cloneCount: 2,
  cloneWallets: {},
  cloneAmounts: {},
  bundleAmounts: {},
  agentBuybackPct: 10,
  mayhemAgentMode: "classic",
  feeShares: [],
  tradePanelEnabled: true,

  selectedAmount: 0,
  customAmount: null,

  setField: (key, value) => set({ [key]: value } as unknown as Partial<FormState>),

  toggleOption: (key) =>
    set((s) => ({ options: { ...s.options, [key]: !s.options[key] } })),

  setOption: (key, value) => set((s) => ({ options: { ...s.options, [key]: value } })),

  setSnipeField: (key, value) => set((s) => ({ snipe: { ...s.snipe, [key]: value } })),

  setImageFile: (file) => {
    const prev = get().imagePreviewUrl;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    set({
      imageFile: file,
      imagePreviewUrl: file ? URL.createObjectURL(file) : null,
    });
  },

  effectiveAmount: () => get().customAmount ?? get().selectedAmount,
}));
