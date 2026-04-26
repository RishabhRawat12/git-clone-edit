import { create } from "zustand";

const FONT_KEY = "compilerhub:fontSize";

interface UiState {
  explorerOpen: boolean;
  fontSize: number;
  setExplorerOpen: (open: boolean) => void;
  toggleExplorer: () => void;
  fontInc: () => void;
  fontDec: () => void;
  setFontSize: (n: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  explorerOpen: false,
  fontSize: Number(localStorage.getItem(FONT_KEY)) || 14,

  setExplorerOpen: (explorerOpen) => set({ explorerOpen }),
  toggleExplorer: () => set((s) => ({ explorerOpen: !s.explorerOpen })),
  fontInc: () =>
    set((s) => {
      const n = Math.min(24, s.fontSize + 1);
      localStorage.setItem(FONT_KEY, String(n));
      return { fontSize: n };
    }),
  fontDec: () =>
    set((s) => {
      const n = Math.max(10, s.fontSize - 1);
      localStorage.setItem(FONT_KEY, String(n));
      return { fontSize: n };
    }),
  setFontSize: (n) => {
    localStorage.setItem(FONT_KEY, String(n));
    set({ fontSize: n });
  },
}));
