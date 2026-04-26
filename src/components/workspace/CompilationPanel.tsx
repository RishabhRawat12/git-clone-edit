import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import {
  CompilePhase,
  PhaseDiagnostic,
} from "@/lib/api";
import { PHASES, useCompilerStore } from "@/store/compiler";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type CategoryId = "problems" | "output" | "warning" | "error";

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "problems", label: "Problems" },
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

function jumpToLine(line: number, phase?: CompilePhase) {
  if (phase) useCompilerStore.getState().setPhase(phase);
  window.dispatchEvent(
    new CustomEvent("compilerhub:goto-line", { detail: { line } }),
  );
}

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
    allDiagnostics,
  } = useCompilerStore();

  const errCount = totalErrors();
  const warnCount = totalWarnings();
  const problemCount = errCount + warnCount;

  return (
    <section className="flex flex-col h-full overflow-hidden bg-surface-1 border border-border rounded-lg">
      {/* Top bar: category tabs (Radix Tabs for proper ARIA) */}
      <Tabs
        value={category}
        onValueChange={(v) => setCategory(v as CategoryId)}
        className="flex flex-col h-full min-h-0"
      >
        <TabsList
          className="flex h-9 w-full items-center justify-start rounded-none border-b border-border bg-surface-1 p-0 gap-0.5 px-2"
          aria-label="Diagnostics view"
        >
          {CATEGORIES.map((c) => {
            const count =
              c.id === "problems"
                ? problemCount
                : c.id === "error"
                  ? errCount
                  : c.id === "warning"
                    ? warnCount
                    : null;
            return (
              <TabsTrigger
                key={c.id}
                value={c.id}
                className={cn(
                  "relative h-9 rounded-none px-3 text-xs-tight font-semibold uppercase tracking-[0.1em] transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  "data-[state=active]:text-foreground data-[state=active]:bg-surface-2 data-[state=active]:shadow-none",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {c.label}
                  {count !== null && count > 0 && (
                    <span
                      className={cn(
                        "px-1 min-w-4 text-center rounded text-2xs font-mono",
                        c.id === "error" || (c.id === "problems" && errCount > 0)
                          ? "bg-destructive/25 text-syntax-error"
                          : "bg-warning/25 text-syntax-warning",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </span>
                <span
                  className="absolute left-1 right-1 bottom-0 h-[2px] bg-primary rounded-full opacity-0 data-[state=active]:opacity-100"
                  data-state={category === c.id ? "active" : "inactive"}
                />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Phase sub-tabs (only for output/error/warning views) */}
        {category !== "problems" && (
          <Tabs
            value={phase}
            onValueChange={(v) => setPhase(v as CompilePhase)}
          >
            <TabsList
              className="flex h-auto w-full items-center justify-start gap-0.5 rounded-none border-b border-border bg-surface-1 px-2 py-1.5"
              aria-label="Compiler phase"
            >
              {PHASES.map((p) => (
                <TabsTrigger
                  key={p}
                  value={p}
                  className={cn(
                    "h-7 rounded px-2.5 py-1 text-xs-tight font-mono transition-colors",
                    "text-muted-foreground hover:text-foreground hover:bg-surface-2",
                    "data-[state=active]:bg-primary/20 data-[state=active]:text-primary",
                  )}
                >
                  {PHASE_LABELS[p]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto bg-terminal font-mono text-xs leading-[1.6] text-syntax-base">
          {isCompiling ? (
            <CompilingState />
          ) : !response ? (
            <EmptyTerminal categoryLabel={CATEGORIES.find(c => c.id === category)?.label ?? ""} phase={phase} />
          ) : category === "problems" ? (
            <ProblemsView items={allDiagnostics()} />
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

        {/* Hidden TabsContent placeholders so Radix doesn't warn (we render body manually) */}
        {CATEGORIES.map((c) => (
          <TabsContent key={c.id} value={c.id} className="hidden" />
        ))}
      </Tabs>
    </section>
  );
}

/* ---------------- States ---------------- */

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-success select-none" aria-hidden>❯</span>
      <span className="flex-1">{children}</span>
    </div>
  );
}

function EmptyTerminal({
  categoryLabel,
  phase,
}: {
  categoryLabel: string;
  phase: CompilePhase;
}) {
  return (
    <div className="px-4 py-4 space-y-1">
      <Prompt>
        <span className="text-muted-foreground">
          waiting for compile — showing {categoryLabel.toLowerCase()} / {PHASE_LABELS[phase]}
        </span>
      </Prompt>
    </div>
  );
}

function CompilingState() {
  // Real, minimal, non-blocking spinner — replaces the fake shimmer.
  return (
    <div
      className="px-4 py-4 flex items-center gap-2 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-3.5 animate-spin text-primary" />
      <span className="text-xs">Compiling…</span>
    </div>
  );
}

/* ---------------- Problems (global) ---------------- */

function ProblemsView({
  items,
}: {
  items: Array<PhaseDiagnostic & { phase: CompilePhase; severity: "error" | "warning" }>;
}) {
  if (!items.length) {
    return (
      <div className="px-4 py-4">
        <Prompt>
          <span className="text-success">no problems detected</span>
        </Prompt>
      </div>
    );
  }
  return (
    <ul className="py-1" role="list" aria-label="All compilation problems">
      {items.map((d, i) => {
        const Icon = d.severity === "error" ? AlertCircle : AlertTriangle;
        return (
          <li key={i}>
            <button
              onClick={() => jumpToLine(d.line, d.phase)}
              className={cn(
                "w-full text-left flex items-center gap-3 px-4 py-1.5 transition-colors",
                d.severity === "error"
                  ? "hover:bg-destructive/15 text-syntax-error"
                  : "hover:bg-warning/15 text-syntax-warning",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="text-2xs uppercase tracking-wider opacity-70 w-14 shrink-0">
                {PHASE_LABELS[d.phase]}
              </span>
              <span className="text-subtle-foreground select-none w-12 text-right shrink-0 font-mono">
                {d.line}:
              </span>
              <span className="flex-1 break-words text-foreground">
                {d.message}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
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
        <div className="text-syntax-fn mb-2">// {tokens.length} tokens</div>
        {tokens.map((t, i) => (
          <button
            key={i}
            onMouseEnter={() =>
              window.dispatchEvent(
                new CustomEvent("compilerhub:highlight-line", {
                  detail: { line: t.line, lexeme: t.lexeme },
                }),
              )
            }
            onMouseLeave={() =>
              window.dispatchEvent(
                new CustomEvent("compilerhub:highlight-line", {
                  detail: { line: 0 },
                }),
              )
            }
            onClick={() => jumpToLine(t.line)}
            className="w-full text-left flex gap-3 hover:bg-surface-2 px-1 transition-colors"
          >
            <span className="text-subtle-foreground select-none w-10 text-right">
              {t.line}
            </span>
            <span className="text-syntax-keyword w-28 truncate">{t.type}</span>
            <span className="text-syntax-string">{t.lexeme}</span>
          </button>
        ))}
      </div>
    );
  }

  if (phase === "syntax") {
    return (
      <div className="px-4 py-3">
        <AstView value={data.output} />
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
        <div className="text-syntax-fn mb-2">// symbol table — {rows.length} entries</div>
        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-x-3 text-xs-tight text-subtle-foreground mb-1 px-1">
          <span className="text-right">line</span>
          <span>name</span>
          <span>type</span>
          <span>scope</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-x-3 hover:bg-surface-2 px-1"
          >
            <span className="text-subtle-foreground text-right">
              {r.line ?? "—"}
            </span>
            <span className="text-foreground">{r.name}</span>
            <span className="text-syntax-type">{r.type}</span>
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
      <div className="text-syntax-fn mb-2">// three-address code</div>
      {lines.map((line, i) => (
        <div key={i} className="flex gap-3 hover:bg-surface-2 px-1">
          <span className="text-subtle-foreground select-none w-10 text-right">
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

/* ---------------- AST view (graphical + JSON toggle) ---------------- */

function AstView({ value }: { value: unknown }) {
  const [mode, setMode] = useState<"tree" | "json">("tree");
  const empty =
    value == null ||
    (typeof value === "object" && Object.keys(value as object).length === 0);
  if (empty) return <Empty text="no syntax tree produced" />;

  return (
    <div>
      <div className="flex items-center gap-1 mb-3">
        <button
          onClick={() => setMode("tree")}
          className={cn(
            "h-6 px-2 rounded text-xs-tight font-mono transition-colors",
            mode === "tree"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
          )}
        >
          Tree
        </button>
        <button
          onClick={() => setMode("json")}
          className={cn(
            "h-6 px-2 rounded text-xs-tight font-mono transition-colors",
            mode === "json"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2",
          )}
        >
          JSON
        </button>
      </div>
      {mode === "tree" ? (
        <AstGraphical value={value} />
      ) : (
        <JsonNode value={value} name="root" depth={0} />
      )}
    </div>
  );
}

interface AstNode {
  label: string;
  detail?: string;
  children: AstNode[];
}

function toAstNode(value: unknown, name: string): AstNode {
  if (value === null || value === undefined) {
    return { label: name, detail: String(value), children: [] };
  }
  if (Array.isArray(value)) {
    return {
      label: name,
      detail: `[${value.length}]`,
      children: value.map((v, i) => toAstNode(v, `${i}`)),
    };
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Heuristic: if object has a "type" field, surface it as the label.
    const typeField = typeof obj.type === "string" ? obj.type : null;
    const label = typeField ? `${typeField}` : name;
    const detail = typeField && name !== "root" ? name : undefined;
    return {
      label,
      detail,
      children: Object.entries(obj)
        .filter(([k]) => k !== "type")
        .map(([k, v]) => toAstNode(v, k)),
    };
  }
  return { label: name, detail: JSON.stringify(value), children: [] };
}

function AstGraphical({ value }: { value: unknown }) {
  const root = useMemo(() => toAstNode(value, "program"), [value]);
  return (
    <div className="overflow-x-auto pb-2">
      <AstBranch node={root} depth={0} />
    </div>
  );
}

function AstBranch({ node, depth }: { node: AstNode; depth: number }) {
  const [open, setOpen] = useState(depth < 3);
  const hasChildren = node.children.length > 0;
  return (
    <div className="flex flex-col items-start">
      <button
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded border bg-surface-2 border-border-strong text-xs-tight font-mono whitespace-nowrap",
          hasChildren
            ? "hover:border-primary/50 cursor-pointer"
            : "cursor-default",
        )}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn("size-3 transition-transform", open && "rotate-90")}
          />
        ) : (
          <span className="size-1.5 rounded-full bg-syntax-string" />
        )}
        <span className="text-syntax-keyword">{node.label}</span>
        {node.detail && (
          <span className="text-muted-foreground">· {node.detail}</span>
        )}
      </button>
      {hasChildren && open && (
        <div className="flex items-stretch ml-4 mt-1.5 pl-4 border-l border-border gap-3">
          <div className="flex flex-col gap-1.5">
            {node.children.map((c, i) => (
              <AstBranch key={i} node={c} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JsonNode({
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
        <span className="text-syntax-fn">{name}</span>
        <span className="text-muted-foreground">: </span>
        <span className="text-syntax-string">{JSON.stringify(value)}</span>
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
        <span className="text-syntax-keyword">{name}</span>
        <span className="text-muted-foreground">
          {Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {open &&
        entries.map(([k, v]) => (
          <JsonNode key={k} value={v} name={k} depth={depth + 1} />
        ))}
    </div>
  );
}

/* ---------------- Per-phase diagnostic list ---------------- */

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
      ? "hover:bg-destructive/15 text-syntax-error"
      : "hover:bg-warning/15 text-syntax-warning";

  return (
    <ul className="py-1" role="list">
      {items.map((d, i) => (
        <li key={i}>
          <button
            onClick={() => jumpToLine(d.line, phase)}
            className={cn(
              "w-full text-left flex gap-3 px-4 py-1 transition-colors",
              tint,
            )}
          >
            <span className="text-subtle-foreground select-none w-12 text-right shrink-0">
              {d.line}:
            </span>
            <span className="opacity-70 uppercase text-2xs tracking-wider mt-[2px] shrink-0">
              {tag}
            </span>
            <span className="flex-1 break-words">{d.message}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
