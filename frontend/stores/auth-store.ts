import { create } from "zustand";
import type { AuthUser } from "@/types/api";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clear: () => void;
}

/**
 * In-memory auth session. The access token deliberately lives in memory only —
 * no localStorage. A httpOnly refresh-cookie flow should be added before
 * production (see docs/frontend.md); this shape avoids rewriting consumers.
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (token, user) => set({ token, user }),
  clear: () => set({ token: null, user: null }),
}));
