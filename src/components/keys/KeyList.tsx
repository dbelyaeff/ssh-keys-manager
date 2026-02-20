import { useState } from "react";
import { useKeysStore } from "@/store/keysStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyGenerateModal } from "./KeyGenerateModal";

export function KeyList() {
  const { keys, selectedKey, selectKey } = useKeysStore();
  const [genOpen, setGenOpen] = useState(false);

  const getBadgeVariant = (type: string) => {
    if (type === "ed25519") return "default";
    if (type === "rsa") return "secondary";
    return "outline";
  };

  return (
    <div className="flex flex-col h-full border-r">
      <div className="px-3 py-2 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SSH-ключи</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {keys.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Key className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Ключей не найдено</p>
              <p className="text-xs mt-1">Нажмите «+» чтобы создать</p>
            </div>
          )}
          {keys.map((key) => (
            <button
              key={key.name}
              onClick={() => selectKey(key.name)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                selectedKey === key.name
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Key className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="flex-1 truncate font-medium">{key.name}</span>
              <Badge variant={getBadgeVariant(key.key_type)} className="text-[10px] px-1.5 py-0">
                {key.key_type}
              </Badge>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setGenOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Новый ключ
        </Button>
      </div>
      <KeyGenerateModal open={genOpen} onOpenChange={setGenOpen} />
    </div>
  );
}
