import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Download, Minus, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFsStore } from "@/store/fs";
import { useUiStore } from "@/store/ui";
import { useCompilerStore } from "@/store/compiler";

const DEFAULT_SNIPPET = `int main() {
    int x = 10;
    if (x > 5) {
        x = x + 1;
    }
    return x;
}
`;

export function CodeEditor() {
  const {
    activeFileId,
    activeContent,
    setContent,
    saveActive,
    saving,
    dirty,
    lastSavedAt,
    files,
  } = useFsStore();

  const { fontSize, fontInc, fontDec } = useUiStore();
  const run = useCompilerStore((s) => s.run);
  const isCompiling = useCompilerStore((s) => s.isCompiling);

  // Local buffer for when there is no active file
  const [scratch, setScratch] = useState(DEFAULT_SNIPPET);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId);
  const value = activeFileId ? activeContent : scratch;
  const filename = activeFile?.name ?? "scratch.c";

  // Debounced auto-save
  useEffect(() => {
    if (!activeFileId || !dirty) return;
    const t = window.setTimeout(() => {
      saveActive().catch(() => toast.error("Failed to save file"));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [activeFileId, activeContent, dirty, saveActive]);

  const handleRun = async () => {
    try {
      await run(value);
      const c = useCompilerStore.getState();
      const e = c.totalErrors();
      const w = c.totalWarnings();
      toast.success(`Compilation finished — ${e} errors, ${w} warnings`);
    } catch {
      toast.error("Compilation request failed");
    }
  };

  const handleExport = () => {
    const blob = new Blob([value], { type: "text/x-c" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcuts
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRun);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFileId) {
        saveActive().catch(() => toast.error("Failed to save"));
      }
    });
  };

  const savedLabel = saving
    ? "saving…"
    : dirty
      ? "unsaved"
      : lastSavedAt
        ? `saved ${new Date(lastSavedAt).toLocaleTimeString()}`
        : "ready";

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="min-w-0 flex items-center gap-3">
          <h2 className="text-base font-semibold tracking-tight">Source Code</h2>
          <span className="font-mono text-xs text-muted-foreground truncate">
            {filename}
          </span>
          {activeFileId && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {savedLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-secondary/40 overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 rounded-none text-muted-foreground hover:text-foreground"
              onClick={fontDec}
              aria-label="Decrease font size"
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="px-2 text-xs font-mono text-muted-foreground border-x border-border">
              {fontSize}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 rounded-none text-muted-foreground hover:text-foreground"
              onClick={fontInc}
              aria-label="Increase font size"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            className="h-9"
          >
            <Download className="size-4 mr-1.5" />
            Export
          </Button>

          <Button
            size="sm"
            onClick={handleRun}
            disabled={isCompiling}
            className="h-9 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90 shadow-[var(--shadow-elegant)]"
          >
            <Play className="size-4 mr-1.5" />
            {isCompiling ? "Running…" : "Run Compiler"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="c"
          theme="vs-dark"
          value={value}
          onChange={(v) => {
            const next = v ?? "";
            if (activeFileId) setContent(next);
            else setScratch(next);
          }}
          onMount={handleMount}
          options={{
            fontSize,
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            automaticLayout: true,
            tabSize: 4,
            renderLineHighlight: "line",
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </section>
  );
}
