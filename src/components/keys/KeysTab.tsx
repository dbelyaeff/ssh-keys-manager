import { useEffect } from "react";
import { useKeysStore } from "@/store/keysStore";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { KeyList } from "./KeyList";
import { KeyDetail } from "./KeyDetail";

export function KeysTab() {
  const { loadKeys } = useKeysStore();

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <KeyList />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75}>
        <KeyDetail />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
