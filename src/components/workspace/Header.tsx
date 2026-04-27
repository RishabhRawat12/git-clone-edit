import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  GitBranch,
  Keyboard,
  LogOut,
  Play,
  Search,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { useFsStore } from "@/store/fs";
import { useCompilerStore } from "@/store/compiler";
import { SettingsDialog } from "./SettingsDialog";
import { BrandMark } from "./BrandMark";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

export function Header() {
  const navigate = useNavigate();
  const { username, logout } = useAuthStore();
  const toggleExplorer = useUiStore((s) => s.toggleExplorer);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const layoutDir = useUiStore((s) => s.layoutDir);
  const toggleLayoutDir = useUiStore((s) => s.toggleLayoutDir);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeFileId = useFsStore((s) => s.activeFileId);
  const files = useFsStore((s) => s.files);
  const activeContent = useFsStore((s) => s.activeContent);
  const saveActive = useFsStore((s) => s.saveActive);
  const activeFile = files.find((f) => f.id === activeFileId);
  const contextLabel = activeFile?.name ?? "scratch.c";

  const run = useCompilerStore((s) => s.run);
  const isCompiling = useCompilerStore((s) => s.isCompiling);

  const isMac =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad/i.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  // Listen for run shortcut from anywhere (palette / editor already bind it,
  // this is a fallback so Cmd+Enter works even when editor is unfocused)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContent]);

  const handleRun = async () => {
    try {
      await run(activeContent || "");
      const c = useCompilerStore.getState();
      toast.success(
        `Compiled — ${c.totalErrors()} errors, ${c.totalWarnings()} warnings`,
      );
    } catch {
      toast.error("Compilation failed");
    }
  };

  const handleSave = async () => {
    if (!activeFileId) return;
    try {
      await saveActive();
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <header
      className={cn(
        "h-8 flex items-center gap-2 px-2 bg-surface-1 shrink-0",
        // Half-strength inset bottom border + subtle top highlight = native chrome feel
        "shadow-[inset_0_-1px_0_hsl(var(--border)/0.6),inset_0_1px_0_hsl(0_0%_100%/0.04)]",
      )}
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 pl-1 pr-2">
        <span className="text-primary">
          <BrandMark size={15} />
        </span>
        <span className="text-[12px] font-semibold tracking-tight text-foreground">
          CompilerHub
        </span>
      </div>

      <span className="h-4 w-px bg-border/60" aria-hidden />

      {/* ── Menubar ───────────────────────────────────────── */}
      <Menubar className="h-7 border-0 bg-transparent p-0 gap-0 shadow-none">
        <MenubarMenu>
          <MenubarTrigger className="h-7 px-2 text-[12px] font-normal text-muted-foreground data-[state=open]:bg-surface-2 data-[state=open]:text-foreground hover:text-foreground rounded-sm cursor-pointer">
            File
          </MenubarTrigger>
          <MenubarContent className="min-w-[200px]">
            <MenubarItem onClick={() => useFsStore.getState().peekFile("")}>
              New File <MenubarShortcut>{modKey}N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleSave} disabled={!activeFileId}>
              Save <MenubarShortcut>{modKey}S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={togglePalette}>
              Open File… <MenubarShortcut>{modKey}P</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={togglePalette}>
              Command Palette <MenubarShortcut>{modKey}K</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="h-7 px-2 text-[12px] font-normal text-muted-foreground data-[state=open]:bg-surface-2 data-[state=open]:text-foreground hover:text-foreground rounded-sm cursor-pointer">
            Edit
          </MenubarTrigger>
          <MenubarContent className="min-w-[180px]">
            <MenubarItem
              onClick={() => document.execCommand("undo")}
            >
              Undo <MenubarShortcut>{modKey}Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={() => document.execCommand("redo")}
            >
              Redo <MenubarShortcut>⇧{modKey}Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={togglePalette}>
              Find in Files <MenubarShortcut>⇧{modKey}F</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="h-7 px-2 text-[12px] font-normal text-muted-foreground data-[state=open]:bg-surface-2 data-[state=open]:text-foreground hover:text-foreground rounded-sm cursor-pointer">
            View
          </MenubarTrigger>
          <MenubarContent className="min-w-[220px]">
            <MenubarItem onClick={toggleExplorer}>
              Toggle Explorer <MenubarShortcut>{modKey}B</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={toggleLayoutDir}>
              {layoutDir === "horizontal"
                ? "Stack Compiler Vertically"
                : "Side-by-side Layout"}
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => useUiStore.getState().fontInc()}>
              Zoom In <MenubarShortcut>{modKey}+</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => useUiStore.getState().fontDec()}>
              Zoom Out <MenubarShortcut>{modKey}-</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="h-7 px-2 text-[12px] font-normal text-muted-foreground data-[state=open]:bg-surface-2 data-[state=open]:text-foreground hover:text-foreground rounded-sm cursor-pointer">
            Run
          </MenubarTrigger>
          <MenubarContent className="min-w-[200px]">
            <MenubarItem onClick={handleRun} disabled={isCompiling}>
              Compile <MenubarShortcut>{modKey}↵</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => useCompilerStore.getState().reset()}>
              Clear Output
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="h-7 px-2 text-[12px] font-normal text-muted-foreground data-[state=open]:bg-surface-2 data-[state=open]:text-foreground hover:text-foreground rounded-sm cursor-pointer">
            Help
          </MenubarTrigger>
          <MenubarContent className="min-w-[200px]">
            <MenubarItem onClick={togglePalette}>
              Show All Commands <MenubarShortcut>{modKey}K</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setSettingsOpen(true)}>
              <Keyboard className="size-3.5 mr-2" />
              Keyboard Shortcuts
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* ── Omnibar (centered, contextual) ────────────────── */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2">
        <button
          onClick={togglePalette}
          className={cn(
            "group hidden sm:flex items-center gap-2 h-6 px-2 max-w-xl w-full",
            "rounded-sm bg-surface-2/50 border border-border/50",
            "hover:border-primary/40 hover:bg-surface-2 focus-visible:outline-none focus-visible:border-primary/60",
            "text-[11px] text-muted-foreground transition-colors",
          )}
          aria-label="Search files and commands"
        >
          <Search className="size-3 text-subtle-foreground shrink-0" />
          <span className="flex-1 text-left truncate">
            <span className="text-foreground/90">{contextLabel}</span>
            <span className="text-subtle-foreground"> — CompilerHub</span>
          </span>
          <kbd className="font-mono text-[10px] px-1.5 py-px rounded-sm bg-surface-3 text-subtle-foreground border border-border/50">
            {modKey}K
          </kbd>
        </button>
      </div>

      {/* ── Right: Run + Branch + User ────────────────────── */}
      <div className="flex items-center gap-1.5 pr-1">
        <Button
          onClick={handleRun}
          disabled={isCompiling}
          size="sm"
          className="h-6 px-2.5 rounded-sm text-[11px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shadow-none"
          title={`Run (${modKey}+Enter)`}
        >
          <Play className="size-3 fill-current" />
          {isCompiling ? "Running" : "Run"}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              className="h-6 px-2 flex items-center gap-1 rounded-sm text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
              title="Current branch"
            >
              <GitBranch className="size-3" />
              main
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={6}
            className="w-56 p-2 panel border-border"
          >
            <div className="text-2xs uppercase tracking-wider text-subtle-foreground px-1.5 pb-1.5">
              Branch
            </div>
            <div className="flex items-center gap-2 px-1.5 py-1.5 rounded-sm bg-surface-2 text-xs font-mono text-foreground">
              <GitBranch className="size-3 text-primary" />
              main
              <span className="ml-auto text-2xs text-subtle-foreground">
                current
              </span>
            </div>
            <p className="mt-2 px-1.5 text-2xs text-subtle-foreground leading-relaxed">
              Source control is coming soon. Connect a Git remote to manage
              branches.
            </p>
          </PopoverContent>
        </Popover>

        <span className="h-4 w-px bg-border/60 mx-0.5" aria-hidden />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-6 pl-1 pr-1.5 flex items-center gap-1.5 rounded-sm hover:bg-surface-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Account menu"
            >
              <UserAvatar name={username ?? "user"} size={20} />
              <span className="hidden md:inline max-w-[100px] truncate">
                {username ?? "Account"}
              </span>
              <ChevronDown className="size-3 text-subtle-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="panel border-border w-56">
            <DropdownMenuLabel className="flex items-center gap-2 py-2">
              <UserAvatar name={username ?? "user"} size={28} />
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {username ?? "Guest"}
                </div>
                <div className="text-2xs text-subtle-foreground truncate">
                  Signed in
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="size-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={togglePalette}>
              <Keyboard className="size-4 mr-2" /> Keyboard shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/auth")}>
              <UserIcon className="size-4 mr-2" /> Switch account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/auth");
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
