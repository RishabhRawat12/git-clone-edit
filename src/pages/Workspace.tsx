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

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      <main className="flex-1 min-h-0 p-1.5">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full"
          autoSaveId="compilerhub:layout-h"
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

          <ResizablePanel defaultSize={52} minSize={30}>
            <ResizablePanelGroup
              direction="vertical"
              autoSaveId="compilerhub:layout-v"
            >
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="h-full pb-1">
                  <CodeEditor />
                </div>
              </ResizablePanel>
              <ResizableHandle className="bg-transparent h-1.5 hover:bg-primary/30 transition-colors" />
              <ResizablePanel defaultSize={30} minSize={15} collapsible>
                <div className="h-full pt-1">
                  <CompilationPanel />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="bg-transparent w-1.5 hover:bg-primary/30 transition-colors" />
          <ResizablePanel defaultSize={30} minSize={20} collapsible>
            <div className="h-full pl-1">
              <CompilationPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <StatusBar />
      <CommandPalette />
    </div>
  );
};

export default Workspace;
