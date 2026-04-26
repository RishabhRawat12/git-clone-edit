import { useEffect, useState } from "react";
import { Circle, GitBranch, Wifi } from "lucide-react";
import { useFsStore } from "@/store/fs";
import { useCompilerStore } from "@/store/compiler";
import { getLanguageFromName } from "@/lib/fileIcons";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const activeFileId = useFsStore((s) => s.activeFileId);
  const files = useFsStore((s) => s.files);
  const saving = useFsStore((s) => s.saving);
  const isCompiling = useCompilerStore((s) => s.isCompiling);
  const totalErrors = useCompilerStore((s) => s.totalErrors());
  const totalWarnings = useCompilerStore((s) => s.totalWarnings());
  const response = useCompilerStore((s) => s.response);

  const activeFile = files.find((f) => f.id === activeFileId);
  const language = getLanguageFromName(activeFile?.name ?? "scratch.c");

  const [pos, setPos] = useState<{ line: number; col: number }>({
    line: 1,
    col: 1,
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { line: number; col: number };
      if (detail) setPos(detail);
    };
    window.addEventListener("compilerhub:cursor", handler);
    return () => window.removeEventListener("compilerhub:cursor", handler);
  }, []);

  const status = isCompiling
    ? { label: "compiling", color: "text-warning" }
    : response
      ? totalErrors > 0
        ? { label: `${totalErrors} errors`, color: "text-destructive" }
        : { label: "ok", color: "text-success" }
      : { label: "ready", color: "text-success" };

  return (
    <footer
      className="h-6 flex items-center justify-between gap-3 px-2 text-2xs font-mono bg-primary text-primary-foreground border-t border-border shrink-0"
      role="status"
      aria-label="Editor status"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1">
          <Circle
            className={cn("size-2 fill-current", status.color)}
            aria-hidden
          />
          {status.label}
        </span>
        <span className="flex items-center gap-1">
          <GitBranch className="size-3" aria-hidden /> main
        </span>
        {response && (
          <span>
            {totalWarnings} warnings · {totalErrors} errors
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {saving && <span>saving…</span>}
        <span>
          Ln {pos.line}, Col {pos.col}
        </span>
        <span className="uppercase tracking-wider">{language}</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span className="flex items-center gap-1">
          <Wifi className="size-3" aria-hidden /> CompilerHub
        </span>
      </div>
    </footer>
  );
}
