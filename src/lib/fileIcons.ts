import {
  Braces,
  Cog,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  FileType,
  Hash,
  Terminal,
  type LucideIcon,
} from "lucide-react";

export interface FileIconInfo {
  Icon: LucideIcon;
  className: string;
}

const MAP: Record<string, FileIconInfo> = {
  c: { Icon: FileCode2, className: "text-sky-400" },
  h: { Icon: Hash, className: "text-sky-300" },
  cpp: { Icon: FileCode2, className: "text-blue-400" },
  cc: { Icon: FileCode2, className: "text-blue-400" },
  hpp: { Icon: Hash, className: "text-blue-300" },
  js: { Icon: FileCode2, className: "text-yellow-400" },
  jsx: { Icon: FileCode2, className: "text-yellow-300" },
  ts: { Icon: FileCode2, className: "text-blue-400" },
  tsx: { Icon: FileCode2, className: "text-blue-400" },
  py: { Icon: FileCode2, className: "text-emerald-400" },
  rs: { Icon: FileCode2, className: "text-orange-400" },
  go: { Icon: FileCode2, className: "text-cyan-400" },
  java: { Icon: FileCode2, className: "text-red-400" },
  json: { Icon: Braces, className: "text-amber-400" },
  yml: { Icon: Cog, className: "text-rose-300" },
  yaml: { Icon: Cog, className: "text-rose-300" },
  toml: { Icon: Cog, className: "text-rose-300" },
  ini: { Icon: Cog, className: "text-rose-300" },
  env: { Icon: Cog, className: "text-emerald-300" },
  md: { Icon: FileText, className: "text-sky-200" },
  txt: { Icon: FileText, className: "text-muted-foreground" },
  sh: { Icon: Terminal, className: "text-emerald-300" },
  png: { Icon: FileImage, className: "text-pink-300" },
  jpg: { Icon: FileImage, className: "text-pink-300" },
  jpeg: { Icon: FileImage, className: "text-pink-300" },
  svg: { Icon: FileImage, className: "text-pink-300" },
  html: { Icon: FileType, className: "text-orange-300" },
  css: { Icon: FileType, className: "text-blue-300" },
};

const SPECIAL: Record<string, FileIconInfo> = {
  makefile: { Icon: Cog, className: "text-rose-300" },
  dockerfile: { Icon: Cog, className: "text-blue-300" },
};

export function getFileIcon(name: string): FileIconInfo {
  const lower = name.toLowerCase();
  if (SPECIAL[lower]) return SPECIAL[lower];
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";
  return (
    MAP[ext] ?? {
      Icon: FileJson,
      className: "text-muted-foreground",
    }
  );
}

export function getLanguageFromName(name: string): string {
  const lower = name.toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";
  const map: Record<string, string> = {
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    hpp: "cpp",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    json: "json",
    md: "markdown",
    sh: "shell",
    html: "html",
    css: "css",
    yml: "yaml",
    yaml: "yaml",
  };
  return map[ext] ?? "plaintext";
}
