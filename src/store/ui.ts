import { create } from "zustand";

const FONT_KEY = "compilerhub:fontSize";
const EXPLORER_KEY = "compilerhub:explorerCollapsed";
const LAYOUT_KEY = "compilerhub:layoutDir"; // "h" | "v"

export type LayoutDir = "horizontal" | "vertical";

interface UiState {
  explorerOpen: boolean; // legacy, still toggles collapsed inverse
  explorerCollapsed: boolean;
  paletteOpen: boolean;
  fontSize: number;
  layoutDir: LayoutDir;
  setExplorerOpen: (open: boolean) => void;
  toggleExplorer: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  fontInc: () => void;
  fontDec: () => void;
  setFontSize: (n: number) => void;
  toggleLayoutDir: () => void;
  setLayoutDir: (d: LayoutDir) => void;
}

const readLayout = (): LayoutDir => {
  const v = localStorage.getItem(LAYOUT_KEY);
  return v === "v" ? "vertical" : "horizontal";
};

export const useUiStore = create<UiState>((set) => ({
  explorerOpen: false,
  explorerCollapsed: localStorage.getItem(EXPLORER_KEY) === "1",
  paletteOpen: false,
  fontSize: Number(localStorage.getItem(FONT_KEY)) || 14,
  layoutDir: readLayout(),

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
  toggleLayoutDir: () =>
    set((s) => {
      const next: LayoutDir =
        s.layoutDir === "horizontal" ? "vertical" : "horizontal";
      localStorage.setItem(LAYOUT_KEY, next === "vertical" ? "v" : "h");
      return { layoutDir: next };
    }),
  setLayoutDir: (d) => {
    localStorage.setItem(LAYOUT_KEY, d === "vertical" ? "v" : "h");
    set({ layoutDir: d });
  },
}));
