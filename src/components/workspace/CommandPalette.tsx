import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useFsStore } from "@/store/fs";
import { useUiStore } from "@/store/ui";
import { useCompilerStore } from "@/store/compiler";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import { getFileIcon } from "@/lib/fileIcons";
import { Play, FilePlus, FolderPlus, LogOut, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const togglePalette = useUiStore((s) => s.togglePalette);
  const toggleExplorer = useUiStore((s) => s.toggleExplorer);
  const fontInc = useUiStore((s) => s.fontInc);
  const fontDec = useUiStore((s) => s.fontDec);

  const files = useFsStore((s) => s.files);
  const selectFile = useFsStore((s) => s.selectFile);
  const activeFileId = useFsStore((s) => s.activeFileId);
  const activeContent = useFsStore((s) => s.activeContent);

  const run = useCompilerStore((s) => s.run);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  // Cmd/Ctrl+K toggles
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleExplorer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette, toggleExplorer]);

  const close = () => setOpen(false);

  const handleRun = async () => {
    close();
    try {
      const code = activeFileId ? activeContent : "";
      await run(code);
      toast.success("Compilation finished");
    } catch {
      toast.error("Compilation failed");
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search files…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {files.length > 0 && (
          <CommandGroup heading="Files">
            {files.slice(0, 50).map((f) => {
              const icon = getFileIcon(f.name);
              return (
                <CommandItem
                  key={f.id}
                  value={`file ${f.name}`}
                  onSelect={() => {
                    selectFile(f.id);
                    close();
                  }}
                >
                  <icon.Icon className={`size-4 mr-2 ${icon.className}`} />
                  <span className="font-mono">{f.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleRun}>
            <Play className="size-4 mr-2" /> Run compiler
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              ⌘↵
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              toggleExplorer();
              close();
            }}
          >
            <FilePlus className="size-4 mr-2" /> Toggle explorer
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              ⌘B
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              fontInc();
            }}
          >
            <Plus className="size-4 mr-2" /> Increase font size
          </CommandItem>
          <CommandItem
            onSelect={() => {
              fontDec();
            }}
          >
            <Minus className="size-4 mr-2" /> Decrease font size
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem
            onSelect={() => {
              logout();
              navigate("/auth");
              close();
            }}
            className="text-destructive"
          >
            <LogOut className="size-4 mr-2" /> Log out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
