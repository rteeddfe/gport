import { create } from "zustand";

interface UiState {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

/** Global client-only UI state (React Query owns server state, not this). */
export const useUiStore = create<UiState>((set) => ({
  isMobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
}));
