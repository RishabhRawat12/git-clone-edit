import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { ChevronRight, Download, Minus, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFsStore } from "@/store/fs";
import { useUiStore } from "@/store/ui";
import { useCompilerStore } from "@/store/compiler";
import { cn } from "@/lib/utils";
import { getFileIcon, getLanguageFromName } from "@/lib/fileIcons";
import { COMPILERHUB_THEME, defineCompilerHubTheme } from "@/lib/monacoTheme";

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
    files,
    folders,
    openTabs,
    selectFile,
    closeTab,
  } = useFsStore();

  const { fontSize, fontInc, fontDec } = useUiStore();
  const run = useCompilerStore((s) => s.run);
  const isCompiling = useCompilerStore((s) => s.isCompiling);

  const [scratch, setScratch] = useState(DEFAULT_SNIPPET);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [editorWidth, setEditorWidth] = useState(800);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId);
  const value = activeFileId ? activeContent : scratch;
  const filename = activeFile?.name ?? "scratch.c";
  const language = getLanguageFromName(filename);
  const showMinimap = editorWidth > 720;

  // Track width to auto-hide minimap
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setEditorWidth(e.contentRect.width);
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // Build breadcrumb from folder hierarchy
  const crumbs: string[] = [];
  if (activeFile) {
    let folderId = activeFile.folder_id;
    const walk: string[] = [];
    while (folderId) {
      const f = folders.find((x) => x.id === folderId);
      if (!f) break;
      walk.unshift(f.name);
      folderId = f.parent_id;
    }
    crumbs.push(...walk, activeFile.name);
  } else {
    crumbs.push(filename);
  }

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

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    defineCompilerHubTheme(monaco);
    monaco.editor.setTheme(COMPILERHUB_THEME);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRun);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFileId) {
        saveActive().catch(() => toast.error("Failed to save"));
      }
    });
    editor.onDidChangeCursorPosition((e) => {
      window.dispatchEvent(
        new CustomEvent("compilerhub:cursor", {
          detail: { line: e.position.lineNumber, col: e.position.column },
        }),
      );
    });
  };

  // Listen for goto-line events from compilation panel
  useEffect(() => {
    const onGoto = (e: Event) => {
      const detail = (e as CustomEvent).detail as { line: number };
      const ed = editorRef.current;
      if (!ed || !detail?.line) return;
      ed.revealLineInCenter(detail.line);
      ed.setPosition({ lineNumber: detail.line, column: 1 });
      ed.focus();
    };
    window.addEventListener("compilerhub:goto-line", onGoto);
    return () => window.removeEventListener("compilerhub:goto-line", onGoto);
  }, []);

  // Tab list — always include scratch entry if no real tabs
  const tabs =
    openTabs.length === 0
      ? [{ id: "__scratch", name: "scratch.c", isScratch: true }]
      : openTabs
          .map((id) => {
            const f = files.find((x) => x.id === id);
            return f
              ? { id: f.id, name: f.name, isScratch: false }
              : null;
          })
          .filter(Boolean) as { id: string; name: string; isScratch: boolean }[];

  return (
    <section className="flex flex-col h-full overflow-hidden bg-card/60 border border-border rounded-lg">
      {/* Tab bar */}
      <div className="flex items-stretch h-9 border-b border-border bg-background/40 overflow-x-auto">
        {tabs.map((t) => {
          const active =
            (t.isScratch && !activeFileId) ||
            (!t.isScratch && t.id === activeFileId);
          const icon = getFileIcon(t.name);
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (!t.isScratch) selectFile(t.id);
              }}
              className={cn(
                "group relative flex items-center gap-2 pl-3 pr-2 text-xs font-mono cursor-pointer border-r border-border min-w-0 max-w-[200px]",
                active
                  ? "bg-card text-foreground"
                  : "bg-background/40 text-muted-foreground hover:text-foreground hover:bg-card/40",
              )}
            >
              {active && (
                <span className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
              )}
              <icon.Icon className={cn("size-3.5 shrink-0", icon.className)} />
              <span className="truncate">{t.name}</span>
              {!t.isScratch && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(t.id);
                  }}
                  className="ml-1 size-4 flex items-center justify-center rounded hover:bg-secondary opacity-60 group-hover:opacity-100"
                  aria-label="Close tab"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          );
        })}
        <div className="flex-1" />
      </div>

      {/* Breadcrumbs + actions */}
      <div className="flex items-center justify-between gap-2 h-8 px-3 border-b border-border bg-background/20">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 min-w-0 text-[11px] font-mono text-muted-foreground"
        >
          <span className="text-muted-foreground/70">CompilerHub</span>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
              <span
                className={cn(
                  "truncate",
                  i === crumbs.length - 1 && "text-foreground",
                )}
              >
                {c}
              </span>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-md border border-border bg-background/40 overflow-hidden">
            <button
              onClick={fontDec}
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              aria-label="Decrease font size"
            >
              <Minus className="size-3" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-muted-foreground border-x border-border">
              {fontSize}
            </span>
            <button
              onClick={fontInc}
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              aria-label="Increase font size"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isCompiling}
            className="h-6 px-2.5 text-[11px] bg-primary/90 hover:bg-primary text-primary-foreground"
          >
            <Play className="size-3 mr-1" />
            {isCompiling ? "Running…" : "Run"}
          </Button>
        </div>
      </div>

      <div ref={wrapperRef} className="flex-1 min-h-0 bg-[#0b1020]">
        <Editor
          height="100%"
          language={language}
          theme={COMPILERHUB_THEME}
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
            fontLigatures: true,
            minimap: { enabled: showMinimap, renderCharacters: false, maxColumn: 80 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            automaticLayout: true,
            tabSize: 4,
            renderLineHighlight: "all",
            renderWhitespace: "selection",
            guides: { indentation: true, highlightActiveIndentation: true },
            padding: { top: 12, bottom: 12 },
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          }}
        />
      </div>

      {/* Inline status hint */}
      {activeFileId && (
        <div className="h-5 px-3 flex items-center text-[10px] font-mono text-muted-foreground/70 border-t border-border bg-background/30">
          {saving ? "saving…" : dirty ? "● unsaved" : "saved"}
        </div>
      )}
    </section>
  );
}
