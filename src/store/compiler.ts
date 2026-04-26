import { create } from "zustand";
import {
  api,
  CompilerCategory,
  CompilePhase,
  CompileResponse,
  normalizeCompileResponse,
  PhaseDiagnostic,
} from "@/lib/api";

interface FlatDiagnostic extends PhaseDiagnostic {
  phase: CompilePhase;
}

interface CompilerState {
  isCompiling: boolean;
  response: CompileResponse | null;
  category: CompilerCategory | "problems";
  phase: CompilePhase;

  setCategory: (c: CompilerCategory | "problems") => void;
  setPhase: (p: CompilePhase) => void;
  run: (code: string) => Promise<void>;
  reset: () => void;

  totalErrors: () => number;
  totalWarnings: () => number;
  errorsByPhase: (phase: CompilePhase) => FlatDiagnostic[];
  warningsByPhase: (phase: CompilePhase) => FlatDiagnostic[];
  allDiagnostics: () => Array<FlatDiagnostic & { severity: "error" | "warning" }>;
}

export const PHASES: CompilePhase[] = [
  "lexical",
  "syntax",
  "semantic",
  "intermediate",
];

export const useCompilerStore = create<CompilerState>((set, get) => ({
  isCompiling: false,
  response: null,
  category: "output",
  phase: "lexical",

  setCategory: (category) => set({ category }),
  setPhase: (phase) => set({ phase }),
  reset: () => set({ response: null }),

  run: async (code) => {
    set({ isCompiling: true });
    try {
      const { data } = await api.post("/api/compile", { code });
      set({ response: normalizeCompileResponse(data) });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.response?.data?.error ?? (err as Error).message;
      set({
        response: normalizeCompileResponse({
          error: msg ?? "Compilation request failed",
        }),
      });
      throw err;
    } finally {
      set({ isCompiling: false });
    }
  },

  totalErrors: () => {
    const r = get().response;
    if (!r) return 0;
    return PHASES.reduce((n, p) => n + (r.data[p]?.errors?.length ?? 0), 0);
  },

  totalWarnings: () => {
    const r = get().response;
    if (!r) return 0;
    return PHASES.reduce((n, p) => n + (r.data[p]?.warnings?.length ?? 0), 0);
  },

  errorsByPhase: (phase) => {
    const r = get().response;
    if (!r) return [];
    return (r.data[phase]?.errors ?? []).map((d) => ({ ...d, phase }));
  },

  warningsByPhase: (phase) => {
    const r = get().response;
    if (!r) return [];
    return (r.data[phase]?.warnings ?? []).map((d) => ({ ...d, phase }));
  },
}));
