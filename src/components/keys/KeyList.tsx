import { useState } from "react";
import { useKeysStore } from "@/store/keysStore";
import { useServersStore } from "@/store/serversStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Key, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyGenerateModal } from "./KeyGenerateModal";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteKey } from "@/lib/tauri";
import { toast } from "sonner";
import { useUIStore } from "@/store/uiStore";
import { t } from "@/lib/i18n";
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

export function KeyList() {
  const { keys, selectedKey, selectKey, loadKeys, checkedKeys, setCheckedKeys } = useKeysStore();
  const { checkedServers } = useServersStore();
  const { openExportDialog } = useUIStore();
  const language = useSettingsStore((s) => s.language);
  const [genOpen, setGenOpen] = useState(false);
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);

  const toggleCheck = (name: string, index: number, shift: boolean) => {
    let newChecked = [...checkedKeys];
    if (newChecked.includes(name)) {
      newChecked = newChecked.filter((k) => k !== name);
    } else {
      if (shift && lastCheckedIndex !== null) {
        const start = Math.min(index, lastCheckedIndex);
        const end = Math.max(index, lastCheckedIndex);
        const toAdd = keys.slice(start, end + 1).map((k) => k.name);
        toAdd.forEach((k) => {
          if (!newChecked.includes(k)) newChecked.push(k);
        });
      } else {
        newChecked.push(name);
      }
    }
    setCheckedKeys(newChecked);
    setLastCheckedIndex(index);
  };

  const handleBulkDelete = async () => {
    for (const name of checkedKeys) {
      try {
        await deleteKey(name);
      } catch (e) {
        toast.error(`${t(language, "common.error")} ${name}: ${e}`);
      }
    }
    toast.success(t(language, "keys.deleted", { name: "..." })); // Generic success
    setCheckedKeys([]);
    loadKeys();
  };

  const getBadgeVariant = (type: string) => {
    if (type === "ed25519") return "default";
    if (type === "rsa") return "secondary";
    return "outline";
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="px-5 py-2 border-b flex items-center">
        <Checkbox
          checked={keys.length > 0 && checkedKeys.length === keys.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setCheckedKeys(keys.map(k => k.name));
            } else {
              setCheckedKeys([]);
            }
          }}
          disabled={keys.length === 0}
          className="mr-2"
        />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t(language, "keys.sidebarTitle")}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {keys.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Key className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">{t(language, "common.noResults")}</p>
            </div>
          )}
          {keys.map((key, idx) => (
            <div
              key={key.name}
              className={cn(
                "w-full flex items-center px-3 rounded-md transition-colors",
                selectedKey === key.name
                   ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Checkbox
                checked={checkedKeys.includes(key.name)}
                onCheckedChange={() => toggleCheck(key.name, idx, false)}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (e.shiftKey) {
                    e.preventDefault();
                    toggleCheck(key.name, idx, true);
                  }
                }}
                className="mr-2"
              />
              <button
                onClick={() => selectKey(key.name)}
                className="flex-1 flex items-center gap-2 py-2 text-left text-sm"
              >
                <span className="flex-1 truncate font-medium">{key.name}</span>
                <Badge variant={getBadgeVariant(key.key_type)} className="text-[10px] px-1.5 py-0">
                  {key.key_type}
                </Badge>
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 border-t flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          className="px-2"
          onClick={() => setGenOpen(true)}
          title={t(language, "keys.generate")}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {checkedKeys.length > 0 && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              title={t(language, "exportTab.exportBtn")}
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
                  <AlertDialogTitle>{t(language, "keys.deleteTitle", { name: "..." })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(language, "keys.deleteDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t(language, "common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t(language, "common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
      <KeyGenerateModal open={genOpen} onOpenChange={setGenOpen} />
    </div>
  );
}
