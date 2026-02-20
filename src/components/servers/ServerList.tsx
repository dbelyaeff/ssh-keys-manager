import { useState } from "react";
import { useServersStore } from "@/store/serversStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { ServerCreateModal } from "./ServerCreateModal";

export function ServerList() {
  const { servers, selectedServer, selectServer } = useServersStore();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col h-full border-r">
      <div className="px-3 py-2 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Серверы</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {servers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Server className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Серверов не найдено</p>
              <p className="text-xs mt-1">Нажмите «+» чтобы добавить</p>
            </div>
          )}
          {servers.map((srv, i) => (
            <button
              key={`${srv.host}-${i}`}
              onClick={() => selectServer(srv.host)}
              className={cn(
                "w-full flex flex-col px-3 py-2 rounded-md text-left text-sm transition-colors",
                selectedServer === srv.host
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span className="font-medium truncate">{srv.host || "Новый сервер"}</span>
              <span className="text-xs text-muted-foreground truncate">{srv.hostname}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Новый сервер
        </Button>
      </div>
      <ServerCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
