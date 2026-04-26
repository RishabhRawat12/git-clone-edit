import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import {
  ImperativePanelHandle,
} from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Header } from "@/components/workspace/Header";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CompilationPanel } from "@/components/workspace/CompilationPanel";
import { FileExplorer } from "@/components/workspace/FileExplorer";
import { StatusBar } from "@/components/workspace/StatusBar";
import { CommandPalette } from "@/components/workspace/CommandPalette";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";

const Workspace = () => {
  const { isAuthenticated, hydrate } = useAuthStore();
  const explorerCollapsed = useUiStore((s) => s.explorerCollapsed);
  const layoutDir = useUiStore((s) => s.layoutDir);
  const explorerPanelRef = useRef<ImperativePanelHandle | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Sync explorer panel collapse state with store
  useEffect(() => {
    const panel = explorerPanelRef.current;
    if (!panel) return;
    if (explorerCollapsed) {
      panel.collapse();
    } else {
      panel.expand();
    }
  }, [explorerCollapsed]);

  const token = useAuthStore((s) => s.token);
  if (!isAuthenticated && !token) {
    return <Navigate to="/auth" replace />;
  }

  // The editor + compiler pair stacks horizontally or vertically based on prefs.
  const editorCompilerPair = (
    <ResizablePanelGroup
      direction={layoutDir}
      className="h-full"
      autoSaveId={`compilerhub:layout-pair-${layoutDir}`}
    >
      <ResizablePanel defaultSize={62} minSize={30}>
        <div className="h-full">
          <CodeEditor />
        </div>
      </ResizablePanel>
      <ResizableHandle
        className={
          layoutDir === "horizontal"
            ? "bg-transparent w-1.5 hover:bg-primary/30 transition-colors"
            : "bg-transparent h-1.5 hover:bg-primary/30 transition-colors"
        }
      />
      <ResizablePanel defaultSize={38} minSize={20} collapsible>
        <div
          className={layoutDir === "horizontal" ? "h-full pl-1" : "h-full pt-1"}
        >
          <CompilationPanel />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );

  return (
    <div className="h-screen flex flex-col bg-surface-0 overflow-hidden">
      <Header />

      <main className="flex-1 min-h-0 p-1.5">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full"
          autoSaveId="compilerhub:layout-shell"
        >
          <ResizablePanel
            ref={explorerPanelRef}
            defaultSize={18}
            minSize={12}
            maxSize={35}
            collapsible
            collapsedSize={0}
            onCollapse={() => useUiStore.setState({ explorerCollapsed: true })}
            onExpand={() => useUiStore.setState({ explorerCollapsed: false })}
            className="min-w-0"
          >
            <div className="h-full pr-1">
              <FileExplorer />
            </div>
          </ResizablePanel>
          <ResizableHandle className="bg-transparent w-1.5 hover:bg-primary/30 transition-colors" />

          <ResizablePanel defaultSize={82} minSize={40}>
            <div className="h-full">{editorCompilerPair}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <StatusBar />
      <CommandPalette />
    </div>
  );
};

export default Workspace;
