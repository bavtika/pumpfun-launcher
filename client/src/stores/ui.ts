import { create } from "zustand";
import type { PageTab } from "../api/types";

export type PopoverKey =
  | "bundle"
  | "snipe"
  | "multideploy"
  | "farmsnipers"
  | "feesharing"
  | "mayhem"
  | "agent"
  | "cashback"
  | null;

interface UiState {
  activePage: PageTab;
  setActivePage: (p: PageTab) => void;

  vampOpen: boolean;
  setVampOpen: (open: boolean) => void;

  feesOpen: boolean;
  setFeesOpen: (open: boolean) => void;

  activePopover: PopoverKey;
  popoverAnchor: { top: number; left: number } | null;
  openPopover: (key: PopoverKey, anchor: { top: number; left: number }) => void;
  togglePopover: (key: Exclude<PopoverKey, null>, anchorRect: DOMRect) => void;
  closePopover: () => void;

  deployModalOpen: boolean;
  setDeployModalOpen: (open: boolean) => void;

  /** True while a deploy request is in flight (blocks keyboard re-entry). */
  deployBusy: boolean;
  setDeployBusy: (busy: boolean) => void;

  activeSettingsSection: string;
  setActiveSettingsSection: (s: string) => void;

  activeEarningsTab: "creator" | "referral";
  setActiveEarningsTab: (t: "creator" | "referral") => void;
}

export const useUiStore = create<UiState>((set) => ({
  activePage: "feed",
  setActivePage: (activePage) => set({ activePage }),

  vampOpen: false,
  setVampOpen: (vampOpen) => set({ vampOpen }),

  feesOpen: false,
  setFeesOpen: (feesOpen) => set({ feesOpen }),

  activePopover: null,
  popoverAnchor: null,
  openPopover: (activePopover, popoverAnchor) => set({ activePopover, popoverAnchor }),
  togglePopover: (key, anchorRect) =>
    set((s) =>
      s.activePopover === key
        ? { activePopover: null, popoverAnchor: null }
        : {
            activePopover: key,
            popoverAnchor: {
              top: anchorRect.bottom + window.scrollY + 6,
              left: anchorRect.left,
            },
          }
    ),
  closePopover: () => set({ activePopover: null, popoverAnchor: null }),

  deployModalOpen: false,
  setDeployModalOpen: (deployModalOpen) => set({ deployModalOpen }),

  deployBusy: false,
  setDeployBusy: (deployBusy) => set({ deployBusy }),

  activeSettingsSection: "filters",
  setActiveSettingsSection: (activeSettingsSection) => set({ activeSettingsSection }),

  activeEarningsTab: "creator",
  setActiveEarningsTab: (activeEarningsTab) => set({ activeEarningsTab }),
}));
