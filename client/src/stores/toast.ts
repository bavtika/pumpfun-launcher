import { create } from "zustand";

export type ToastType = "" | "success" | "error";

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: "",
  type: "",
  visible: false,
  show: (message, type = "") => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ message, type, visible: true });
    toastTimeout = setTimeout(() => set({ visible: false }), 3200);
  },
  hide: () => {
    if (toastTimeout) clearTimeout(toastTimeout);
    set({ visible: false });
  },
}));

export const toast = (message: string, type: ToastType = "") =>
  useToastStore.getState().show(message, type);
