import { useEffect, useState } from "react";
import {
  ChevronRight,
  File as FileIcon,
  Folder,
  FolderPlus,
  FilePlus,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useFsStore, TreeNode } from "@/store/fs";
import { useUiStore } from "@/store/ui";
import { cn } from "@/lib/utils";

export function FileExplorerSheet() {
  const { explorerOpen, setExplorerOpen } = useUiStore();
  const { tree, refresh, loading, createFile, createFolder } = useFsStore();

  const [pending, setPending] = useState<{
    type: "file" | "folder";
    parentId: string | null;
  } | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (explorerOpen) refresh().catch(() => toast.error("Failed to load files"));
  }, [explorerOpen, refresh]);

  // Cmd/Ctrl + B
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        useUiStore.getState().toggleExplorer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleCreate = async () => {
    if (!pending || !newName.trim()) return;
    try {
      if (pending.type === "file") {
        await createFile(newName.trim(), pending.parentId);
      } else {
        await createFolder(newName.trim(), pending.parentId);
      }
      setPending(null);
      setNewName("");
    } catch {
      toast.error("Failed to create");
    }
  };

  return (
    <>
      <Sheet open={explorerOpen} onOpenChange={setExplorerOpen}>
        <SheetContent
          side="left"
          className="w-[320px] sm:w-[360px] panel border-border p-0"
        >
          <SheetHeader className="px-4 py-4 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle>Files</SheetTitle>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    setPending({ type: "file", parentId: null });
                    setNewName("");
                  }}
                  aria-label="New file"
                >
                  <FilePlus className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    setPending({ type: "folder", parentId: null });
                    setNewName("");
                  }}
                  aria-label="New folder"
                >
                  <FolderPlus className="size-4" />
                </Button>
              </div>
            </div>
            <SheetDescription className="text-xs">
              Click a file to open it in the editor.
            </SheetDescription>
          </SheetHeader>

          <div className="px-2 py-2 overflow-auto h-[calc(100vh-100px)]">
            {loading && !tree.length ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : !tree.length ? (
              <div className="px-3 py-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Create your first file
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setPending({ type: "file", parentId: null });
                    setNewName("main.c");
                  }}
                  className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                >
                  <FilePlus className="size-4 mr-1.5" /> New file
                </Button>
              </div>
            ) : (
              <TreeView
                nodes={tree}
                onAddChild={(node) =>
                  setPending({ type: "file", parentId: node.id })
                }
                onAddFolderChild={(node) =>
                  setPending({ type: "folder", parentId: node.id })
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent className="panel border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              New {pending?.type === "folder" ? "folder" : "file"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the new {pending?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder={pending?.type === "file" ? "main.c" : "src"}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreate}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TreeView({
  nodes,
  onAddChild,
  onAddFolderChild,
  depth = 0,
}: {
  nodes: TreeNode[];
  onAddChild: (n: TreeNode) => void;
  onAddFolderChild: (n: TreeNode) => void;
  depth?: number;
}) {
  return (
    <ul className="text-sm">
      {nodes.map((n) => (
        <NodeRow
          key={n.id}
          node={n}
          depth={depth}
          onAddChild={onAddChild}
          onAddFolderChild={onAddFolderChild}
        />
      ))}
    </ul>
  );
}

function NodeRow({
  node,
  depth,
  onAddChild,
  onAddFolderChild,
}: {
  node: TreeNode;
  depth: number;
  onAddChild: (n: TreeNode) => void;
  onAddFolderChild: (n: TreeNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { selectFile, activeFileId, rename, remove, setExplorerOpen } =
    {
      ...useFsStore.getState(),
      setExplorerOpen: useUiStore.getState().setExplorerOpen,
    };

  const isActive = node.type === "file" && activeFileId === node.id;
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder) setOpen((o) => !o);
    else {
      useFsStore.getState().selectFile(node.id);
      // Close on mobile-ish viewport
      if (window.innerWidth < 768) setExplorerOpen(false);
    }
  };

  const submitRename = async () => {
    if (!name.trim() || name === node.name) {
      setRenaming(false);
      setName(node.name);
      return;
    }
    try {
      await useFsStore.getState().rename(node.type, node.id, name.trim());
      setRenaming(false);
    } catch {
      toast.error("Failed to rename");
    }
  };

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:bg-secondary/60",
              isActive && "bg-primary/15 text-primary",
            )}
            style={{ paddingLeft: depth * 12 + 8 }}
            onClick={handleClick}
          >
            {isFolder ? (
              <ChevronRight
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform",
                  open && "rotate-90",
                )}
              />
            ) : (
              <span className="size-3.5" />
            )}
            {isFolder ? (
              <Folder className="size-4 text-primary/80" />
            ) : (
              <FileIcon className="size-4 text-muted-foreground" />
            )}
            {renaming ? (
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRename();
                  if (e.key === "Escape") {
                    setRenaming(false);
                    setName(node.name);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-6 px-1 py-0 text-xs"
              />
            ) : (
              <span className="truncate flex-1 font-mono text-xs">
                {node.name}
              </span>
            )}

            {isFolder && (
              <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(node);
                  }}
                  className="p-0.5 rounded hover:bg-secondary"
                  aria-label="New file"
                >
                  <FilePlus className="size-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFolderChild(node);
                  }}
                  className="p-0.5 rounded hover:bg-secondary"
                  aria-label="New folder"
                >
                  <FolderPlus className="size-3.5 text-muted-foreground" />
                </button>
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                // Trigger context menu via right-click is built-in;
                // here we just open rename quickly.
                setRenaming(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-secondary"
              aria-label="Actions"
            >
              <MoreHorizontal className="size-3.5 text-muted-foreground" />
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="panel border-border">
          <ContextMenuItem onClick={() => setRenaming(true)}>
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setConfirmDelete(true)}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isFolder && open && node.children.length > 0 && (
        <TreeView
          nodes={node.children}
          onAddChild={onAddChild}
          onAddFolderChild={onAddFolderChild}
          depth={depth + 1}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="panel border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{node.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
              {isFolder && " All files inside will also be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await useFsStore
                    .getState()
                    .remove(node.type, node.id);
                  setConfirmDelete(false);
                } catch {
                  toast.error("Failed to delete");
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
