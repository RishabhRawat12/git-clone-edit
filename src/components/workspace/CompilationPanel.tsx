import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  CircleAlert,
  FileWarning,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CompilerCategory,
  CompilePhase,
  PhaseDiagnostic,
} from "@/lib/api";
import { PHASES, useCompilerStore } from "@/store/compiler";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: CompilerCategory; label: string }[] = [
  { id: "output", label: "Output" },
  { id: "warning", label: "Warning" },
  { id: "error", label: "Error" },
];

const PHASE_LABELS: Record<CompilePhase, string> = {
  lexical: "Lexical",
  syntax: "Syntax",
  semantic: "Semantic",
  intermediate: "Intermediate Code",
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
    <section className="panel flex flex-col h-full overflow-hidden">
      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Compilation category"
        className="flex items-center gap-1 px-3 pt-3"
      >
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
                "relative px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center gap-2">
                {c.label}
                {count !== null && count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "h-5 px-1.5 text-[10px]",
                      c.id === "error"
                        ? "bg-destructive/20 text-destructive border border-destructive/40"
                        : "bg-warning/20 text-warning border border-warning/40",
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </span>
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      <div className="border-b border-border" />

      {/* Phase sub-tabs */}
      <div
        role="tablist"
        aria-label="Compilation phase"
        className="flex flex-wrap items-center gap-2 px-3 py-3"
      >
        {PHASES.map((p) => {
          const active = phase === p;
          return (
            <button
              key={p}
              role="tab"
              aria-selected={active}
              onClick={() => setPhase(p)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              {PHASE_LABELS[p]}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
        {isCompiling ? (
          <CenterState>
            <Loader2 className="size-6 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Running compiler…</p>
          </CenterState>
        ) : !response ? (
          <CenterState>
            <p className="text-sm italic text-muted-foreground">
              Compile your code to see {category} for {PHASE_LABELS[phase]}.
            </p>
          </CenterState>
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

function CenterState({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center px-6">
      {children}
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
    if (!tokens.length)
      return (
        <CenterState>
          <p className="text-sm italic text-muted-foreground">
            No lexical tokens produced.
          </p>
        </CenterState>
      );
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token Type</TableHead>
            <TableHead>Lexeme</TableHead>
            <TableHead className="w-20 text-right">Line</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((t, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs text-primary">
                {t.type}
              </TableCell>
              <TableCell className="font-mono text-xs">{t.lexeme}</TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {t.line}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (phase === "syntax") {
    return <JsonTree value={data.output} />;
  }

  if (phase === "semantic") {
    const rows = (data.output as Array<{
      name: string;
      type: string;
      scope?: string;
      line?: number;
    }>) ?? [];
    if (!rows.length)
      return (
        <CenterState>
          <p className="text-sm italic text-muted-foreground">
            Symbol table is empty.
          </p>
        </CenterState>
      );
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead className="w-20 text-right">Line</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{r.name}</TableCell>
              <TableCell className="font-mono text-xs text-primary">
                {r.type}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {r.scope ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {r.line ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // intermediate
  const tac = String(data.output ?? "");
  if (!tac.trim())
    return (
      <CenterState>
        <p className="text-sm italic text-muted-foreground">
          No intermediate code produced.
        </p>
      </CenterState>
    );
  return (
    <pre className="font-mono text-xs leading-6 bg-secondary/40 rounded-lg p-4 overflow-auto whitespace-pre">
      {tac}
    </pre>
  );
}

function JsonTree({ value }: { value: unknown }) {
  const empty =
    value == null ||
    (typeof value === "object" && Object.keys(value as object).length === 0);
  if (empty)
    return (
      <CenterState>
        <p className="text-sm italic text-muted-foreground">
          No syntax tree produced.
        </p>
      </CenterState>
    );
  return (
    <div className="font-mono text-xs leading-6 bg-secondary/40 rounded-lg p-3 overflow-auto">
      <Node value={value} name="root" depth={0} />
    </div>
  );
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
      <div style={{ paddingLeft: depth * 12 }}>
        <span className="text-muted-foreground">{name}:</span>{" "}
        <span className="text-primary">{JSON.stringify(value)}</span>
      </div>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform",
            open && "rotate-90",
          )}
        />
        <span>{name}</span>
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

/* ---------------- Diagnostics list ---------------- */

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
      <CenterState>
        <p className="text-sm italic text-muted-foreground">
          No {severity}s in {PHASE_LABELS[phase]} phase.
        </p>
      </CenterState>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((d, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
        >
          {severity === "error" ? (
            <CircleAlert className="size-4 mt-0.5 text-destructive shrink-0" />
          ) : (
            <AlertTriangle className="size-4 mt-0.5 text-warning shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="h-5 text-[10px] uppercase tracking-wide border-primary/30 text-primary bg-primary/10"
              >
                {PHASE_LABELS[phase]}
              </Badge>
              <button
                onClick={() => {
                  // Future: jump editor cursor to line
                  window.dispatchEvent(
                    new CustomEvent("compilerhub:goto-line", {
                      detail: { line: d.line },
                    }),
                  );
                }}
                className="text-xs font-mono text-muted-foreground hover:text-primary"
              >
                line {d.line}
              </button>
            </div>
            <p className="text-sm leading-snug font-mono">{d.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
