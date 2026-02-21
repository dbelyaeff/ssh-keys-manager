import { useState } from "react";
import { useServersStore } from "@/store/serversStore";
import { useKeysStore } from "@/store/keysStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Server, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ServerCreateModal } from "./ServerCreateModal";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteServer } from "@/lib/tauri";
import { toast } from "sonner";
import { useUIStore } from "@/store/uiStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ServerList() {
  const { servers, selectedServer, selectServer, loadServers, checkedServers, setCheckedServers } = useServersStore();
  const { checkedKeys } = useKeysStore();
  const { openExportDialog } = useUIStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);

  const toggleCheck = (host: string, index: number, shift: boolean) => {
    let newChecked = [...checkedServers];
    if (newChecked.includes(host)) {
      newChecked = newChecked.filter((s) => s !== host);
    } else {
      if (shift && lastCheckedIndex !== null) {
        const start = Math.min(index, lastCheckedIndex);
        const end = Math.max(index, lastCheckedIndex);
        const toAdd = servers.slice(start, end + 1).map((s) => s.host);
        toAdd.forEach((h) => {
          if (!newChecked.includes(h)) newChecked.push(h);
        });
      } else {
        newChecked.push(host);
      }
    }
    setCheckedServers(newChecked);
    setLastCheckedIndex(index);
  };

  const handleBulkDelete = async () => {
    for (const host of checkedServers) {
      try {
        await deleteServer(host);
      } catch (e) {
        toast.error(`Ошибка при удалении ${host}: ${e}`);
      }
    }
    toast.success("Выбранные серверы удалены");
    setCheckedServers([]);
    loadServers();
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="px-5 py-2 border-b flex items-center">
        <Checkbox
          checked={servers.length > 0 && checkedServers.length === servers.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setCheckedServers(servers.map(s => s.host));
            } else {
              setCheckedServers([]);
            }
          }}
          disabled={servers.length === 0}
          className="mr-2"
        />
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
          {servers.map((srv, idx) => (
            <div
              key={`${srv.host}-${idx}`}
              className={cn(
                "w-full flex items-center px-3 rounded-md transition-colors",
                selectedServer === srv.host
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Checkbox
                checked={checkedServers.includes(srv.host)}
                onCheckedChange={() => toggleCheck(srv.host, idx, false)}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (e.shiftKey) {
                    e.preventDefault();
                    toggleCheck(srv.host, idx, true);
                  }
                }}
                className="mr-2"
              />
              <button
                onClick={() => selectServer(srv.host)}
                className="flex-1 flex flex-col py-2 text-left text-sm"
              >
                <span className="font-medium truncate">{srv.host || "Новый сервер"}</span>
                <span className="text-xs text-muted-foreground truncate">{srv.hostname}</span>
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 border-t flex items-center justify-between">
        <Button variant="ghost" size="sm" className="px-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
        {checkedServers.length > 0 && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              title="Экспортировать выбранные"
              onClick={() => openExportDialog(checkedKeys, checkedServers)}
            >
              <Download className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить выбранные серверы?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Выбрано серверов: {checkedServers.length}. Это действие нельзя отменить.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
      <ServerCreateModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
