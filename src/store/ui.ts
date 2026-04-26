import { create } from "zustand";

const FONT_KEY = "compilerhub:fontSize";
const EXPLORER_KEY = "compilerhub:explorerCollapsed";

interface UiState {
  explorerOpen: boolean; // legacy, still toggles collapsed inverse
  explorerCollapsed: boolean;
  paletteOpen: boolean;
  fontSize: number;
  setExplorerOpen: (open: boolean) => void;
  toggleExplorer: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  fontInc: () => void;
  fontDec: () => void;
  setFontSize: (n: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  explorerOpen: false,
  explorerCollapsed: localStorage.getItem(EXPLORER_KEY) === "1",
  paletteOpen: false,
  fontSize: Number(localStorage.getItem(FONT_KEY)) || 14,

  setExplorerOpen: (explorerOpen) => set({ explorerOpen }),
  toggleExplorer: () =>
    set((s) => {
      const next = !s.explorerCollapsed;
      localStorage.setItem(EXPLORER_KEY, next ? "1" : "0");
      return { explorerCollapsed: next };
    }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
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
