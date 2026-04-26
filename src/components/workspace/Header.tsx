import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="panel mx-3 mt-3 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleExplorer}
          aria-label="Toggle file explorer"
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="size-5" />
        </Button>
        <span className="size-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-elegant)]">
          <Zap className="size-4 text-primary-foreground" />
        </span>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">CompilerHub</h1>
          <Badge
            variant="outline"
            className="border-border bg-secondary/60 text-xs text-muted-foreground"
          >
            Enterprise
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-success animate-pulse" />
          System Ready
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="bg-primary/15 hover:bg-primary/25 text-foreground border border-primary/30"
            >
              {username ?? "Account"}
              <ChevronDown className="size-4 ml-1" />
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
