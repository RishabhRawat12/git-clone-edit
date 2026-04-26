import { useEffect, useState } from "react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import { getFileIcon } from "@/lib/fileIcons";

export function FileExplorer() {
  const { tree, refresh, loading, createFile, createFolder } = useFsStore();
  const [pending, setPending] = useState<{
    type: "file" | "folder";
    parentId: string | null;
  } | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    refresh().catch(() => toast.error("Failed to load files"));
  }, [refresh]);

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
    <aside className="h-full flex flex-col bg-surface-1 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 h-9 border-b border-border bg-surface-1">
        <span className="text-xs-tight font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setPending({ type: "file", parentId: null });
              setNewName("");
            }}
            aria-label="New file"
          >
            <FilePlus className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setPending({ type: "folder", parentId: null });
              setNewName("");
            }}
            aria-label="New folder"
          >
            <FolderPlus className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto py-1">
        {loading && !tree.length ? (
          <div className="flex items-center gap-2 px-3 py-6 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading…
          </div>
        ) : !tree.length ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-muted-foreground mb-3">
              No files yet
            </p>
            <Button
              size="sm"
              onClick={() => {
                setPending({ type: "file", parentId: null });
                setNewName("main.c");
              }}
              className="h-7 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30"
            >
              <FilePlus className="size-3.5 mr-1.5" /> New file
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
              className="bg-primary text-primary-foreground"
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
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
    <ul className={cn("text-sm", depth > 0 && "border-l border-border/60 ml-3")}>
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

  const activeFileId = useFsStore((s) => s.activeFileId);
  const isActive = node.type === "file" && activeFileId === node.id;
  const isFolder = node.type === "folder";

  const handleClick = () => {
    if (isFolder) setOpen((o) => !o);
    else useFsStore.getState().peekFile(node.id);
  };
  const handleDoubleClick = () => {
    if (isFolder) return;
    useFsStore.getState().pinFile(node.id);
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

  const fileIcon = !isFolder ? getFileIcon(node.name) : null;

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group relative flex items-center gap-1.5 pr-1.5 py-[3px] cursor-pointer hover:bg-surface-2 transition-colors",
              isActive &&
                "bg-surface-2 text-foreground before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary",
            )}
            style={{ paddingLeft: depth * 10 + 6 }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          >
            {isFolder ? (
              <ChevronRight
                className={cn(
                  "size-3 text-muted-foreground transition-transform shrink-0",
                  open && "rotate-90",
                )}
              />
            ) : (
              <span className="size-3 shrink-0" />
            )}
            {isFolder ? (
              open ? (
                <FolderOpen className="size-3.5 text-amber-300/90 shrink-0" />
              ) : (
                <Folder className="size-3.5 text-amber-300/90 shrink-0" />
              )
            ) : fileIcon ? (
              <fileIcon.Icon
                className={cn("size-3.5 shrink-0", fileIcon.className)}
              />
            ) : null}
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
                className="h-5 px-1 py-0 text-xs"
              />
            ) : (
              <span className="truncate flex-1 font-mono text-[12px] leading-5">
                {node.name}
              </span>
            )}

            <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
              {isFolder && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddChild(node);
                    }}
                    className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    aria-label="New file"
                    title="New file"
                  >
                    <FilePlus className="size-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddFolderChild(node);
                    }}
                    className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                    aria-label="New folder"
                    title="New folder"
                  >
                    <FolderPlus className="size-3" />
                  </button>
                </>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenaming(true);
                }}
                className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                aria-label="Rename"
                title="Rename"
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                aria-label="Delete"
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="panel border-border">
          {isFolder && (
            <>
              <ContextMenuItem onClick={() => onAddChild(node)}>
                New file
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onAddFolderChild(node)}>
                New folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
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
                  await useFsStore.getState().remove(node.type, node.id);
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
