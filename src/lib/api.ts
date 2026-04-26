import axios from "axios";

const BASE_URL_KEY = "compilerhub:baseURL";
const TOKEN_KEY = "compilerhub:token";

export const DEFAULT_BASE_URL = "http://localhost:5000";

export const getBaseURL = () =>
  localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;

export const setBaseURL = (url: string) => {
  localStorage.setItem(BASE_URL_KEY, url);
  api.defaults.baseURL = url;
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("compilerhub:username");
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(err);
  },
);

/* ---------------- Compiler response normalization ---------------- */

export type CompilePhase = "lexical" | "syntax" | "semantic" | "intermediate";
export type CompilerCategory = "output" | "warning" | "error";

export interface PhaseDiagnostic {
  line: number;
  message: string;
}

export interface PhaseResult<T = unknown> {
  output: T;
  warnings: PhaseDiagnostic[];
  errors: PhaseDiagnostic[];
}

export interface CompileResponse {
  success: boolean;
  data: {
    lexical: PhaseResult<Array<{ type: string; lexeme: string; line: number }>>;
    syntax: PhaseResult<unknown>;
    semantic: PhaseResult<
      Array<{ name: string; type: string; scope?: string; line?: number }>
    >;
    intermediate: PhaseResult<string>;
  };
}

const empty = (): PhaseResult => ({ output: [], warnings: [], errors: [] });

/** Normalize legacy `{ compiler_logs, lexical, syntax, semantic, error }`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeCompileResponse(raw: any): CompileResponse {
  if (raw && raw.data && raw.data.lexical && raw.data.intermediate) {
    return raw as CompileResponse;
  }
  const safe = raw ?? {};
  return {
    success: !safe.error,
    data: {
      lexical: { ...empty(), output: safe.lexical ?? [] },
      syntax: { ...empty(), output: safe.syntax ?? {} },
      semantic: { ...empty(), output: safe.semantic ?? [] },
      intermediate: {
        ...empty(),
        output: safe.intermediate ?? safe.compiler_logs ?? "",
        errors: safe.error
          ? [{ line: 0, message: String(safe.error) }]
          : [],
      },
    },
  };
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
