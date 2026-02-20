import { useEffect } from "react";
import { useServersStore } from "@/store/serversStore";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ServerList } from "./ServerList";
import { ServerDetail } from "./ServerDetail";

export function ServersTab() {
  const { loadServers } = useServersStore();

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <ServerList />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75}>
        <ServerDetail />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
