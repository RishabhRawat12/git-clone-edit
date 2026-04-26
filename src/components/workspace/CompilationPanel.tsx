import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  CompilerCategory,
  CompilePhase,
  PhaseDiagnostic,
} from "@/lib/api";
import { PHASES, useCompilerStore } from "@/store/compiler";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: CompilerCategory; label: string }[] = [
  { id: "output", label: "Output" },
  { id: "warning", label: "Warnings" },
  { id: "error", label: "Errors" },
];

const PHASE_LABELS: Record<CompilePhase, string> = {
  lexical: "Lexical",
  syntax: "Syntax",
  semantic: "Semantic",
  intermediate: "IR",
};

export function CompilationPanel() {
  const {
    response,
    isCompiling,
    category,
    phase,
    setCategory,
    setPhase,
    totalErrors,
    totalWarnings,
    errorsByPhase,
    warningsByPhase,
  } = useCompilerStore();

  const errCount = totalErrors();
  const warnCount = totalWarnings();

  return (
    <section className="flex flex-col h-full overflow-hidden bg-card/60 border border-border rounded-lg">
      {/* Top bar: category tabs */}
      <div className="flex items-center h-9 border-b border-border bg-background/40 px-2 gap-0.5">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          const count =
            c.id === "error" ? errCount : c.id === "warning" ? warnCount : null;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(c.id)}
              className={cn(
                "relative h-9 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {c.label}
                {count !== null && count > 0 && (
                  <span
                    className={cn(
                      "px-1 min-w-4 text-center rounded text-[10px] font-mono",
                      c.id === "error"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-warning/20 text-warning",
                    )}
                  >
                    {count}
                  </span>
                )}
              </span>
              {active && (
                <span className="absolute left-1 right-1 bottom-0 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Phase sub-tabs */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-background/20">
        {PHASES.map((p) => {
          const active = phase === p;
          return (
            <button
              key={p}
              role="tab"
              aria-selected={active}
              onClick={() => setPhase(p)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-mono rounded transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {PHASE_LABELS[p]}
            </button>
          );
        })}
      </div>

      {/* Body — terminal */}
      <div className="flex-1 min-h-0 overflow-auto bg-[#0a0d18] font-mono text-[12px] leading-[1.6] text-[#c0caf5]">
        {isCompiling ? (
          <CompilingShimmer />
        ) : !response ? (
          <EmptyTerminal category={category} phase={phase} />
        ) : category === "output" ? (
          <OutputView phase={phase} />
        ) : category === "error" ? (
          <DiagnosticList
            items={errorsByPhase(phase)}
            severity="error"
            phase={phase}
          />
        ) : (
          <DiagnosticList
            items={warningsByPhase(phase)}
            severity="warning"
            phase={phase}
          />
        )}
      </div>
    </section>
  );
}

/* ---------------- States ---------------- */

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-emerald-400 select-none">❯</span>
      <span className="flex-1">{children}</span>
    </div>
  );
}

function EmptyTerminal({
  category,
  phase,
}: {
  category: CompilerCategory;
  phase: CompilePhase;
}) {
  return (
    <div className="px-4 py-4 space-y-1">
      <Prompt>
        <span className="text-muted-foreground">
          waiting for compile — showing {category} / {PHASE_LABELS[phase]}
        </span>
      </Prompt>
      <Prompt>
        <span className="inline-block w-2 h-4 align-middle bg-[#bb9af7] animate-pulse" />
      </Prompt>
    </div>
  );
}

function CompilingShimmer() {
  return (
    <div className="px-4 py-4 space-y-1.5">
      <Prompt>
        <span className="text-emerald-300">compile</span>
        <span className="text-muted-foreground"> --target=c99 --verbose</span>
      </Prompt>
      <div className="pl-4 space-y-1.5">
        {[60, 80, 45, 90, 70, 35].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground/60">{String(i + 1).padStart(2, " ")}│</span>
            <span
              className="h-3 rounded-sm bg-gradient-to-r from-primary/30 via-primary/10 to-transparent animate-pulse"
              style={{ width: `${w}%` }}
            />
          </div>
        ))}
      </div>
      <Prompt>
        <span className="inline-block w-2 h-4 align-middle bg-[#bb9af7] animate-[pulse_0.9s_ease-in-out_infinite]" />
      </Prompt>
    </div>
  );
}

/* ---------------- Output by phase ---------------- */

function OutputView({ phase }: { phase: CompilePhase }) {
  const response = useCompilerStore((s) => s.response)!;
  const data = response.data[phase];

  if (phase === "lexical") {
    const tokens = (data.output as Array<{
      type: string;
      lexeme: string;
      line: number;
    }>) ?? [];
    if (!tokens.length) return <Empty text="no lexical tokens produced" />;
    return (
      <div className="px-4 py-3">
        <div className="text-[#7aa2f7] mb-2">// {tokens.length} tokens</div>
        {tokens.map((t, i) => (
          <div key={i} className="flex gap-3 hover:bg-white/[0.02] px-1">
            <span className="text-muted-foreground/50 select-none w-10 text-right">
              {t.line}
            </span>
            <span className="text-[#bb9af7] w-28 truncate">{t.type}</span>
            <span className="text-[#9ece6a]">{t.lexeme}</span>
          </div>
        ))}
      </div>
    );
  }

  if (phase === "syntax") {
    return (
      <div className="px-4 py-3">
        <JsonTree value={data.output} />
      </div>
    );
  }

  if (phase === "semantic") {
    const rows = (data.output as Array<{
      name: string;
      type: string;
      scope?: string;
      line?: number;
    }>) ?? [];
    if (!rows.length) return <Empty text="symbol table is empty" />;
    return (
      <div className="px-4 py-3">
        <div className="text-[#7aa2f7] mb-2">// symbol table — {rows.length} entries</div>
        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-x-3 text-[11px] text-muted-foreground/60 mb-1 px-1">
          <span className="text-right">line</span>
          <span>name</span>
          <span>type</span>
          <span>scope</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-x-3 hover:bg-white/[0.02] px-1"
          >
            <span className="text-muted-foreground/50 text-right">
              {r.line ?? "—"}
            </span>
            <span className="text-foreground">{r.name}</span>
            <span className="text-[#2ac3de]">{r.type}</span>
            <span className="text-muted-foreground">{r.scope ?? "—"}</span>
          </div>
        ))}
      </div>
    );
  }

  // intermediate
  const tac = String(data.output ?? "");
  if (!tac.trim()) return <Empty text="no intermediate code produced" />;
  const lines = tac.split("\n");
  return (
    <div className="px-4 py-3">
      <div className="text-[#7aa2f7] mb-2">// three-address code</div>
      {lines.map((line, i) => (
        <div key={i} className="flex gap-3 hover:bg-white/[0.02] px-1">
          <span className="text-muted-foreground/50 select-none w-10 text-right">
            {i + 1}
          </span>
          <span className="whitespace-pre">{line}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="px-4 py-4">
      <Prompt>
        <span className="text-muted-foreground italic">{text}</span>
      </Prompt>
    </div>
  );
}

function JsonTree({ value }: { value: unknown }) {
  const empty =
    value == null ||
    (typeof value === "object" && Object.keys(value as object).length === 0);
  if (empty) return <Empty text="no syntax tree produced" />;
  return <Node value={value} name="root" depth={0} />;
}

function Node({
  value,
  name,
  depth,
}: {
  value: unknown;
  name: string;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isObj = value !== null && typeof value === "object";

  if (!isObj) {
    return (
      <div style={{ paddingLeft: depth * 14 }}>
        <span className="text-[#7aa2f7]">{name}</span>
        <span className="text-muted-foreground">: </span>
        <span className="text-[#9ece6a]">{JSON.stringify(value)}</span>
      </div>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-foreground hover:text-primary"
      >
        <ChevronRight
          className={cn("size-3 transition-transform", open && "rotate-90")}
        />
        <span className="text-[#bb9af7]">{name}</span>
        <span className="text-muted-foreground/70">
          {Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {open &&
        entries.map(([k, v]) => (
          <Node key={k} value={v} name={k} depth={depth + 1} />
        ))}
    </div>
  );
}

/* ---------------- Diagnostics ---------------- */

function DiagnosticList({
  items,
  severity,
  phase,
}: {
  items: PhaseDiagnostic[];
  severity: "error" | "warning";
  phase: CompilePhase;
}) {
  if (!items.length) {
    return (
      <Empty
        text={`no ${severity}s in ${PHASE_LABELS[phase].toLowerCase()} phase`}
      />
    );
  }

  const tag = severity === "error" ? "error" : "warning";
  const tint =
    severity === "error"
      ? "bg-destructive/[0.06] hover:bg-destructive/[0.10] text-[#f7768e]"
      : "bg-warning/[0.06] hover:bg-warning/[0.10] text-[#e0af68]";

  return (
    <div className="py-1">
      {items.map((d, i) => (
        <button
          key={i}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("compilerhub:goto-line", {
                detail: { line: d.line },
              }),
            )
          }
          className={cn(
            "w-full text-left flex gap-3 px-4 py-1 transition-colors",
            tint,
          )}
        >
          <span className="text-muted-foreground/50 select-none w-12 text-right shrink-0">
            {d.line}:
          </span>
          <span className="opacity-70 uppercase text-[10px] tracking-wider mt-[2px] shrink-0">
            {tag}
          </span>
          <span className="flex-1 break-words">{d.message}</span>
        </button>
      ))}
    </div>
  );
}
