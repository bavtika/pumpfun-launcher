import { create } from "zustand";
import { api } from "../api/client";
import type { PublicWallet } from "../api/types";
import { applyDevToFeeShares } from "../lib/feeShares";
import { toast } from "./toast";
import { useFormStore } from "./form";

interface WalletsState {
  wallets: PublicWallet[];
  loading: boolean;
  selectedPubkey: string | null;
  /** pubkeys selected inside the bundle popover checklist */
  bundleSelection: Set<string>;

  loadWallets: () => Promise<void>;
  selectWallet: (pubkey: string) => void;
  toggleBundleSelection: (pubkey: string) => void;
  createWallets: (count: number) => Promise<void>;
  importWallet: (secretKey: string, name: string) => Promise<boolean>;
  deleteWallet: (pubkey: string) => Promise<void>;
  renameWallet: (pubkey: string, name: string) => Promise<void>;
}

export const useWalletsStore = create<WalletsState>((set, get) => ({
  wallets: [],
  loading: false,
  selectedPubkey: null,
  bundleSelection: new Set<string>(),

  loadWallets: async () => {
    set({ loading: true });
    try {
      const wallets = await api.getWallets();
      set((s) => {
        const stillThere = wallets.some((w) => w.pubkey === s.selectedPubkey);
        const dev = wallets.find((w) => w.isDev);
        const selectedPubkey = stillThere
          ? s.selectedPubkey
          : (dev?.pubkey ?? wallets[0]?.pubkey ?? null);
        return {
          wallets: wallets.map((w) => ({
            ...w,
            isDev: selectedPubkey ? w.pubkey === selectedPubkey : w.isDev,
          })),
          loading: false,
          selectedPubkey,
          bundleSelection: new Set(
            [...s.bundleSelection].filter((pk) => wallets.some((w) => w.pubkey === pk))
          ),
        };
      });
    } catch (e) {
      set({ loading: false });
      toast(e instanceof Error ? e.message : "Failed to load wallets", "error");
    }
  },

  selectWallet: (pubkey) => {
    const { wallets, selectedPubkey } = get();
    const alreadyDev = wallets.some((w) => w.pubkey === pubkey && w.isDev);
    if (selectedPubkey === pubkey && alreadyDev) return;

    set({
      selectedPubkey: pubkey,
      wallets: wallets.map((w) => ({ ...w, isDev: w.pubkey === pubkey })),
    });

    const form = useFormStore.getState();
    if (form.options.feesharing || form.feeShares.length) {
      form.setField("feeShares", applyDevToFeeShares(form.feeShares, pubkey));
    }

    if (!alreadyDev) {
      void api.setDevWallet(pubkey).catch((e) => {
        toast(e instanceof Error ? e.message : "Failed to set dev wallet", "error");
      });
    }
  },

  toggleBundleSelection: (pubkey) =>
    set((s) => {
      const next = new Set(s.bundleSelection);
      if (next.has(pubkey)) next.delete(pubkey);
      else next.add(pubkey);
      return { bundleSelection: next };
    }),

  createWallets: async (count) => {
    try {
      await api.createWallets(count);
      await get().loadWallets();
      toast(`Created ${count} wallet${count > 1 ? "s" : ""}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create wallets", "error");
    }
  },

  importWallet: async (secretKey, name) => {
    try {
      await api.importWallet(secretKey, name);
      await get().loadWallets();
      toast("Wallet imported", "success");
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed", "error");
      return false;
    }
  },

  deleteWallet: async (pubkey) => {
    try {
      await api.deleteWallet(pubkey);
      await get().loadWallets();
      toast("Wallet deleted", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  },

  renameWallet: async (pubkey, name) => {
    try {
      await api.renameWallet(pubkey, name);
      await get().loadWallets();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Rename failed", "error");
    }
  },
}));
