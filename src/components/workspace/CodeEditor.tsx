import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as monacoT from "monaco-editor";
import { ChevronRight, Circle, Download, Minus, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFsStore } from "@/store/fs";
import { useUiStore } from "@/store/ui";
import { useCompilerStore, PHASES } from "@/store/compiler";
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
    previewTabId,
    peekFile,
    pinFile,
    closeTab,
  } = useFsStore();

  const { fontSize, fontInc, fontDec } = useUiStore();
  const run = useCompilerStore((s) => s.run);
  const isCompiling = useCompilerStore((s) => s.isCompiling);
  const compilerResponse = useCompilerStore((s) => s.response);

  const [scratch, setScratch] = useState(DEFAULT_SNIPPET);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const [editorWidth, setEditorWidth] = useState(800);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Tab bar refs/state for scroll-fade indicators
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const [tabFade, setTabFade] = useState({ left: false, right: false });

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

  // Tab bar: wheel → horizontal scroll + fade indicator updates
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const updateFades = () => {
      const max = el.scrollWidth - el.clientWidth;
      setTabFade({
        left: el.scrollLeft > 4,
        right: el.scrollLeft < max - 4,
      });
    };
    const onWheel = (e: WheelEvent) => {
      // Convert vertical wheel into horizontal scroll on the tab bar
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
      updateFades();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", updateFades, { passive: true });
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    updateFades();
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", updateFades);
      ro.disconnect();
    };
  }, [openTabs.length]);

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
    monacoRef.current = monaco;
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

  // Sync compiler diagnostics → Monaco markers (red squigglies)
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const model = ed.getModel();
    if (!model) return;

    const markers: monacoT.editor.IMarkerData[] = [];
    if (compilerResponse) {
      for (const phase of PHASES) {
        const phaseData = compilerResponse.data[phase];
        for (const e of phaseData?.errors ?? []) {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: `[${phase}] ${e.message}`,
            startLineNumber: Math.max(1, e.line),
            startColumn: 1,
            endLineNumber: Math.max(1, e.line),
            endColumn: model.getLineMaxColumn(Math.max(1, Math.min(e.line, model.getLineCount()))),
          });
        }
        for (const w of phaseData?.warnings ?? []) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: `[${phase}] ${w.message}`,
            startLineNumber: Math.max(1, w.line),
            startColumn: 1,
            endLineNumber: Math.max(1, w.line),
            endColumn: model.getLineMaxColumn(Math.max(1, Math.min(w.line, model.getLineCount()))),
          });
        }
      }
    }
    monaco.editor.setModelMarkers(model, "compilerhub", markers);
  }, [compilerResponse, activeFileId]);

  // Line-jump flash decoration
  const flashDecorationsRef = useRef<string[]>([]);
  useEffect(() => {
    const onGoto = (e: Event) => {
      const detail = (e as CustomEvent).detail as { line: number };
      const ed = editorRef.current;
      const monaco = monacoRef.current;
      if (!ed || !monaco || !detail?.line) return;
      ed.revealLineInCenter(detail.line);
      ed.setPosition({ lineNumber: detail.line, column: 1 });
      ed.focus();
      // Apply flash decoration
      flashDecorationsRef.current = ed.deltaDecorations(
        flashDecorationsRef.current,
        [
          {
            range: new monaco.Range(detail.line, 1, detail.line, 1),
            options: {
              isWholeLine: true,
              className: "editor-line-flash",
            },
          },
        ],
      );
      // Clear after animation
      window.setTimeout(() => {
        if (editorRef.current) {
          flashDecorationsRef.current = editorRef.current.deltaDecorations(
            flashDecorationsRef.current,
            [],
          );
        }
      }, 1500);
    };
    window.addEventListener("compilerhub:goto-line", onGoto);
    return () => window.removeEventListener("compilerhub:goto-line", onGoto);
  }, []);

  // Lexical token hover → temporary line highlight
  const hoverDecorationsRef = useRef<string[]>([]);
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const ed = editorRef.current;
      const monaco = monacoRef.current;
      if (!ed || !monaco) return;
      const detail = (e as CustomEvent).detail as { line: number };
      if (!detail?.line) {
        hoverDecorationsRef.current = ed.deltaDecorations(
          hoverDecorationsRef.current,
          [],
        );
        return;
      }
      hoverDecorationsRef.current = ed.deltaDecorations(
        hoverDecorationsRef.current,
        [
          {
            range: new monaco.Range(detail.line, 1, detail.line, 1),
            options: {
              isWholeLine: true,
              className: "editor-line-flash",
            },
          },
        ],
      );
    };
    window.addEventListener("compilerhub:highlight-line", onHighlight);
    return () =>
      window.removeEventListener("compilerhub:highlight-line", onHighlight);
  }, []);

  // Tab list — always include scratch entry if no real tabs
  const tabs =
    openTabs.length === 0
      ? [{ id: "__scratch", name: "scratch.c", isScratch: true, isPreview: false }]
      : openTabs
          .map((id) => {
            const f = files.find((x) => x.id === id);
            return f
              ? {
                  id: f.id,
                  name: f.name,
                  isScratch: false,
                  isPreview: id === previewTabId,
                }
              : null;
          })
          .filter(Boolean) as {
          id: string;
          name: string;
          isScratch: boolean;
          isPreview: boolean;
        }[];

  return (
    <section className="flex flex-col h-full overflow-hidden bg-surface-1 border border-border rounded-lg">
      {/* Tab bar — wheel-scrollable with edge fade indicators */}
      <div
        className={cn(
          "relative h-9 border-b border-border bg-surface-1",
          (tabFade.left || tabFade.right) && "scroll-fade-x",
        )}
        style={{
          // Show fades only on the relevant side
          ["--show-left" as string]: tabFade.left ? "1" : "0",
          ["--show-right" as string]: tabFade.right ? "1" : "0",
        }}
      >
        <div
          ref={tabBarRef}
          role="tablist"
          aria-label="Open files"
          aria-orientation="horizontal"
          className="flex items-stretch h-full overflow-x-auto scrollbar-none"
        >
          {tabs.map((t) => {
            const active =
              (t.isScratch && !activeFileId) ||
              (!t.isScratch && t.id === activeFileId);
            const icon = getFileIcon(t.name);
            const showDirtyDot = active && dirty && !t.isScratch;
            return (
              <div
                key={t.id}
                role="tab"
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                aria-controls="compilerhub-editor-region"
                onClick={() => {
                  if (!t.isScratch) peekFile(t.id);
                }}
                onDoubleClick={() => {
                  if (!t.isScratch) pinFile(t.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!t.isScratch) peekFile(t.id);
                  }
                }}
                className={cn(
                  "group relative flex items-center gap-2 pl-3 pr-2 text-xs-tight font-mono cursor-pointer border-r border-border min-w-0 max-w-[200px] transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "bg-surface-1 text-muted-foreground hover:text-foreground hover:bg-surface-2/60",
                  t.isPreview && "italic",
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
                    className="ml-1 size-4 flex items-center justify-center rounded hover:bg-surface-3 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showDirtyDot
                        ? `Close ${t.name} (unsaved changes)`
                        : `Close ${t.name}`
                    }
                    title={showDirtyDot ? "Unsaved changes" : "Close"}
                  >
                    {showDirtyDot ? (
                      <Circle
                        className="size-2 fill-current text-syntax-warning"
                        aria-hidden
                      />
                    ) : (
                      <X className="size-3" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breadcrumbs (semantic ol/li) + actions */}
      <div className="flex items-center justify-between gap-2 h-8 px-3 border-b border-border bg-surface-1">
        <nav
          aria-label="File path"
          className="min-w-0 text-xs-tight font-mono text-muted-foreground"
        >
          <ol className="flex items-center gap-1 min-w-0">
            <li className="text-subtle-foreground">CompilerHub</li>
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li
                  key={i}
                  className="flex items-center gap-1 min-w-0"
                  {...(last ? { "aria-current": "page" } : {})}
                >
                  <ChevronRight
                    className="size-3 shrink-0 text-subtle-foreground"
                    aria-hidden
                  />
                  <span className={cn("truncate", last && "text-foreground")}>
                    {c}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-md border border-border bg-surface-2 overflow-hidden">
            <button
              onClick={fontDec}
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-3"
              aria-label="Decrease font size"
            >
              <Minus className="size-3" />
            </button>
            <span className="px-1.5 text-2xs font-mono text-muted-foreground border-x border-border">
              {fontSize}
            </span>
            <button
              onClick={fontInc}
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-3"
              aria-label="Increase font size"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-6 px-2 text-xs-tight text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isCompiling}
            className="h-6 px-2.5 text-xs-tight bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Play className="size-3 mr-1" />
            {isCompiling ? "Running…" : "Run"}
          </Button>
        </div>
      </div>

      <div
        id="compilerhub-editor-region"
        ref={wrapperRef}
        className="flex-1 min-h-0 bg-[#0b1020]"
      >
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
        <div className="h-5 px-3 flex items-center text-2xs font-mono text-muted-foreground border-t border-border bg-surface-1">
          {saving ? "saving…" : dirty ? "● unsaved" : "saved"}
        </div>
      )}
    </section>
  );
}
