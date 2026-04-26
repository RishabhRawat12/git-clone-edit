import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  PanelLeft,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
import { SettingsDialog } from "./SettingsDialog";

export function Header() {
  const navigate = useNavigate();
  const { username, logout } = useAuthStore();
  const toggleExplorer = useUiStore((s) => s.toggleExplorer);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isMac =
    typeof navigator !== "undefined" &&
    /mac|iphone|ipad/i.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <header className="h-9 flex items-center justify-between gap-3 px-2 border-b border-border bg-card/50 shrink-0">
      <div className="flex items-center gap-1">
        <button
          onClick={toggleExplorer}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          aria-label="Toggle file explorer"
          title={`Toggle Explorer (${modKey}+B)`}
        >
          <PanelLeft className="size-3.5" />
        </button>
        <span className="size-5 rounded flex items-center justify-center bg-gradient-to-br from-primary to-primary-glow ml-1">
          <Zap className="size-3 text-primary-foreground" />
        </span>
        <h1 className="text-xs font-semibold tracking-tight ml-1">
          CompilerHub
        </h1>
      </div>

      <button
        onClick={togglePalette}
        className="hidden sm:flex items-center gap-2 h-6 px-2 max-w-md w-72 rounded-md bg-background/60 border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <Search className="size-3" />
        <span className="flex-1 text-left">Search files, run commands…</span>
        <kbd className="font-mono text-[10px] px-1 rounded bg-secondary/60 border border-border">
          {modKey}K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {username ?? "Account"}
              <ChevronDown className="size-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="panel border-border">
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="size-4 mr-2" /> Settings
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
