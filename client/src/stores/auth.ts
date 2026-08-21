import { create } from "zustand";
import type { AuthUser } from "../api/types";

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user, ready: true }),
  clear: () => set({ user: null, ready: true }),
}));
