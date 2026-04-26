import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Header } from "@/components/workspace/Header";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CompilationPanel } from "@/components/workspace/CompilationPanel";
import { FileExplorerSheet } from "@/components/workspace/FileExplorerSheet";
import { useAuthStore } from "@/store/auth";

const Workspace = () => {
  const { isAuthenticated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // After hydrate runs, useAuthStore reflects the latest token.
  const token = useAuthStore((s) => s.token);
  if (!isAuthenticated && !token) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 min-h-0 px-3 pb-3 pt-3">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full rounded-xl"
        >
          <ResizablePanel defaultSize={55} minSize={30}>
            <div className="h-full pr-1.5">
              <CodeEditor />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle className="bg-transparent" />
          <ResizablePanel defaultSize={45} minSize={25}>
            <div className="h-full pl-1.5">
              <CompilationPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <FileExplorerSheet />
    </div>
  );
};

export default Workspace;
