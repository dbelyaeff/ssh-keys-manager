import { useState, useEffect } from "react";
import { useKeysStore } from "@/store/keysStore";
import { saveKey, deleteKey } from "@/lib/tauri";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Eye, EyeOff, Save, Trash2, KeyRound } from "lucide-react";

export function KeyDetail() {
  const { keys, selectedKey, keyContent, loadKeys, selectKey } = useKeysStore();
  const key = keys.find((k) => k.name === selectedKey);

  const [privateContent, setPrivateContent] = useState("");
  const [publicContent, setPublicContent] = useState("");
  const [showPrivate, setShowPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrivateContent(keyContent?.private_content ?? "");
    setPublicContent(keyContent?.public_content ?? "");
    setShowPrivate(false);
  }, [keyContent, selectedKey]);

  if (!selectedKey || !key) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <KeyRound className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm">Выберите ключ из списка</p>
      </div>
    );
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveKey(key.name, privateContent, publicContent);
      toast.success("Ключ сохранён");
      await loadKeys();
    } catch (e) {
      toast.error(`Ошибка сохранения: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteKey(key.name);
      toast.success(`Ключ «${key.name}» удалён`);
      await loadKeys();
      const { keys: newKeys } = useKeysStore.getState();
      if (newKeys.length > 0) selectKey(newKeys[0].name);
    } catch (e) {
      toast.error(`Ошибка удаления: ${e}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b">
        <h2 className="font-semibold text-sm">{key.name}</h2>
        <Badge variant="outline" className="text-xs">{key.key_type}</Badge>
        <span className="text-xs text-muted-foreground ml-auto truncate">{key.path_private}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Public Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Публичный ключ</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(publicContent, "Публичный ключ")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Копировать</TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            value={publicContent}
            onChange={(e) => setPublicContent(e.target.value)}
            className="font-mono text-xs h-20 resize-none"
            spellCheck={false}
          />
        </div>

        <Separator />

        {/* Private Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Приватный ключ</Label>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPrivate((v) => !v)}>
                    {showPrivate ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showPrivate ? "Скрыть" : "Показать"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(privateContent, "Приватный ключ")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Копировать</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Textarea
            value={showPrivate ? privateContent : "•".repeat(Math.min(privateContent.length, 80))}
            onChange={(e) => { if (showPrivate) setPrivateContent(e.target.value); }}
            readOnly={!showPrivate}
            className="font-mono text-xs h-40 resize-none"
            spellCheck={false}
          />
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Комментарий</Label>
          <Input
            value={key.comment}
            readOnly
            className="font-mono text-xs"
          />
        </div>
      </div>

      <Separator />
      <div className="flex justify-end gap-2 px-6 py-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="group text-muted-foreground/50 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 overflow-hidden">
              <Trash2 className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 whitespace-nowrap">Удалить</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить ключ «{key.name}»?</AlertDialogTitle>
              <AlertDialogDescription>
                Оба файла ключа будут удалены безвозвратно. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Сохраняю..." : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}
