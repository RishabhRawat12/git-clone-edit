import { create } from "zustand";
import { api } from "@/lib/api";

export interface FsFile {
  id: string;
  name: string;
  content: string;
  folder_id: string | null;
}
export interface FsFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface TreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children: TreeNode[];
}

interface FsState {
  files: FsFile[];
  folders: FsFolder[];
  tree: TreeNode[];
  activeFileId: string | null;
  activeContent: string;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  loading: boolean;
  openTabs: string[];
  /** File currently shown in italic preview tab — replaced on next peek. */
  previewTabId: string | null;

  refresh: () => Promise<void>;
  /** Single-click peek: open as preview (replaces previous preview tab). */
  peekFile: (id: string) => void;
  /** Double-click pin: open as a permanent tab. */
  pinFile: (id: string) => void;
  /** Legacy alias — peeks (kept for backwards compat with existing callers). */
  selectFile: (id: string) => void;
  closeTab: (id: string) => void;
  setContent: (content: string) => void;
  saveActive: () => Promise<void>;

  createFile: (name: string, folderId: string | null) => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  rename: (
    type: "file" | "folder",
    id: string,
    name: string,
  ) => Promise<void>;
  remove: (type: "file" | "folder", id: string) => Promise<void>;
}

function buildTree(files: FsFile[], folders: FsFolder[]): TreeNode[] {
  const folderMap = new Map<string, TreeNode>();
  folders.forEach((f) =>
    folderMap.set(f.id, {
      id: f.id,
      name: f.name,
      type: "folder",
      children: [],
    }),
  );

  const roots: TreeNode[] = [];
  folders.forEach((f) => {
    const node = folderMap.get(f.id)!;
    if (f.parent_id && folderMap.has(f.parent_id)) {
      folderMap.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  files.forEach((file) => {
    const node: TreeNode = {
      id: file.id,
      name: file.name,
      type: "file",
      children: [],
    };
    if (file.folder_id && folderMap.has(file.folder_id)) {
      folderMap.get(file.folder_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export const useFsStore = create<FsState>((set, get) => ({
  files: [],
  folders: [],
  tree: [],
  activeFileId: null,
  activeContent: "",
  dirty: false,
  saving: false,
  lastSavedAt: null,
  loading: false,
  openTabs: [],
  previewTabId: null,

  refresh: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/api/fs/tree");
      const files: FsFile[] = data.files ?? [];
      const folders: FsFolder[] = data.folders ?? [];
      set({ files, folders, tree: buildTree(files, folders) });
    } finally {
      set({ loading: false });
    }
  },

  peekFile: (id) => {
    const file = get().files.find((f) => f.id === id);
    if (!file) return;
    set((s) => {
      // Already pinned? just activate.
      if (s.openTabs.includes(id) && s.previewTabId !== id) {
        return {
          activeFileId: id,
          activeContent: file.content ?? "",
          dirty: false,
        };
      }
      // Replace previous preview tab (if any) with this one
      let nextTabs = s.openTabs.slice();
      if (s.previewTabId && s.previewTabId !== id) {
        nextTabs = nextTabs.filter((t) => t !== s.previewTabId);
      }
      if (!nextTabs.includes(id)) nextTabs.push(id);
      return {
        openTabs: nextTabs,
        previewTabId: id,
        activeFileId: id,
        activeContent: file.content ?? "",
        dirty: false,
      };
    });
  },

  pinFile: (id) => {
    const file = get().files.find((f) => f.id === id);
    if (!file) return;
    set((s) => ({
      openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id],
      previewTabId: s.previewTabId === id ? null : s.previewTabId,
      activeFileId: id,
      activeContent: file.content ?? "",
      dirty: false,
    }));
  },

  selectFile: (id) => {
    // Backwards compat: behaves like peek.
    get().peekFile(id);
  },

  closeTab: (id) => {
    const s = get();
    const idx = s.openTabs.indexOf(id);
    if (idx === -1) return;
    const next = s.openTabs.filter((t) => t !== id);
    let nextActive = s.activeFileId;
    let nextContent = s.activeContent;
    if (s.activeFileId === id) {
      const fallback = next[idx] ?? next[idx - 1] ?? null;
      nextActive = fallback;
      const f = fallback ? s.files.find((x) => x.id === fallback) : null;
      nextContent = f?.content ?? "";
    }
    set({
      openTabs: next,
      previewTabId: s.previewTabId === id ? null : s.previewTabId,
      activeFileId: nextActive,
      activeContent: nextContent,
      dirty: nextActive === s.activeFileId ? s.dirty : false,
    });
  },

  setContent: (content) => {
    set((s) => {
      // Editing a preview tab promotes it to a pinned tab.
      const promoted =
        s.previewTabId && s.previewTabId === s.activeFileId
          ? { previewTabId: null }
          : {};
      return { activeContent: content, dirty: true, ...promoted };
    });
  },

  saveActive: async () => {
    const { activeFileId, activeContent } = get();
    if (!activeFileId) return;
    set({ saving: true });
    try {
      await api.put(`/api/fs/file/${activeFileId}`, { content: activeContent });
      set((s) => ({
        files: s.files.map((f) =>
          f.id === activeFileId ? { ...f, content: activeContent } : f,
        ),
        dirty: false,
        lastSavedAt: Date.now(),
      }));
    } finally {
      set({ saving: false });
    }
  },

  createFile: async (name, folderId) => {
    await api.post("/api/fs/file", { name, folder_id: folderId, content: "" });
    await get().refresh();
  },

  createFolder: async (name, parentId) => {
    await api.post("/api/fs/folder", { name, parent_id: parentId });
    await get().refresh();
  },

  rename: async (type, id, name) => {
    await api.put(`/api/fs/${type}/${id}`, { name });
    await get().refresh();
  },

  remove: async (type, id) => {
    await api.delete(`/api/fs/${type}/${id}`);
    if (type === "file") {
      set((s) => ({
        openTabs: s.openTabs.filter((t) => t !== id),
        previewTabId: s.previewTabId === id ? null : s.previewTabId,
        ...(s.activeFileId === id
          ? { activeFileId: null, activeContent: "", dirty: false }
          : {}),
      }));
    }
    await get().refresh();
  },
}));
