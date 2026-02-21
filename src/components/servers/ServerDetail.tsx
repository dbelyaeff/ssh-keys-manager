import { useState, useEffect } from "react";
import { useServersStore } from "@/store/serversStore";
import { useKeysStore } from "@/store/keysStore";
import { useSettingsStore } from "@/store/settingsStore";
import { saveServer, deleteServer, connectToServer, installKeyToServer, removeKnownHost, checkServerConnection } from "@/lib/tauri";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Save, Trash2, Terminal, Upload, Server, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyGenerateModal } from "@/components/keys/KeyGenerateModal";
import { ServerConfig } from "@/lib/tauri";

export function ServerDetail() {
  const { servers, selectedServer, loadServers, selectServer } = useServersStore();
  const { keys, loadKeys } = useKeysStore();
  const terminal = useSettingsStore((s) => s.terminal);
  const srv = servers.find((s) => s.host === selectedServer);

  const [form, setForm] = useState<ServerConfig>({ host: "", hostname: "", user: "root", port: 22, identity_file: "" });
  const [originalHost, setOriginalHost] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [installing, setInstalling] = useState(false);
  const [fingerprintHost, setFingerprintHost] = useState("");
  const [genOpen, setGenOpen] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (srv) {
      setForm({ ...srv });
      setOriginalHost(srv.host);
      setIsConnected(false);
    }
  }, [srv, selectedServer]);

  useEffect(() => {
    if (!form.hostname) {
      setIsConnected(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsChecking(true);
      try {
        const ok = await checkServerConnection(form);
        setIsConnected(ok);
      } catch {
        setIsConnected(false);
      } finally {
        setIsChecking(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [form.hostname, form.user, form.port, form.identity_file]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  if (!srv) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Server className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm">Выберите сервер из списка</p>
      </div>
    );
  }

  const set = (field: keyof ServerConfig, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.host.trim()) { toast.error("Укажите имя хоста (Host)"); return; }
    setSaving(true);
    try {
      await saveServer(originalHost, form);
      toast.success(`Сервер «${form.host}» сохранён`);
      await loadServers();
      selectServer(form.host);
    } catch (e) {
      toast.error(`Ошибка сохранения: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteServer(form.host);
      toast.success(`Сервер «${form.host}» удалён`);
      await loadServers();
    } catch (e) {
      toast.error(`Ошибка удаления: ${e}`);
    }
  };

  const handleConnect = async () => {
    try {
      await connectToServer(form, terminal);
      toast.success("Терминал открыт");
    } catch (e) {
      toast.error(`Ошибка подключения: ${e}`);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    const id = toast.loading("Устанавливаю ключ на сервер...");
    try {
      await installKeyToServer(form, password);
      toast.dismiss(id);
      toast.success("Ключ успешно установлен");
      setInstallOpen(false);
      setPassword("");
      setIsConnected(true);
    } catch (e: unknown) {
      toast.dismiss(id);
      const msg = String(e);
      if (msg.includes("FingerprintMismatch") || msg.includes("IDENTIFICATION HAS CHANGED")) {
        setFingerprintHost(form.hostname);
        setInstallOpen(false);
      } else {
        toast.error(`Ошибка: ${msg}`);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleRemoveFingerprint = async () => {
    try {
      await removeKnownHost(fingerprintHost);
      toast.success("Старый fingerprint удалён. Попробуйте установить ключ снова.");
      setFingerprintHost("");
    } catch (e) {
      toast.error(`Ошибка: ${e}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b">
        <h2 className="font-semibold text-sm">{form.host || "Новый сервер"}</h2>
        {form.hostname && <span className="text-xs text-muted-foreground">{form.hostname}</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Host <span className="text-muted-foreground">(псевдоним)</span></Label>
            <Input value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="my-server" />
          </div>
          <div className="space-y-1.5">
            <Label>HostName <span className="text-muted-foreground">(IP или домен)</span></Label>
            <Input value={form.hostname} onChange={(e) => set("hostname", e.target.value)} placeholder="192.168.1.1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>User</Label>
            <Input value={form.user} onChange={(e) => set("user", e.target.value)} placeholder="root" />
          </div>
          <div className="space-y-1.5">
            <Label>Port</Label>
            <Input type="number" value={form.port} onChange={(e) => set("port", Number(e.target.value))} placeholder="22" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>IdentityFile <span className="text-muted-foreground">(SSH-ключ)</span></Label>
          <div className="flex gap-2">
            <Popover open={keyOpen} onOpenChange={setKeyOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                  <span className="truncate">{form.identity_file || "Выберите ключ..."}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Поиск ключа..." />
                  <CommandList>
                    <CommandEmpty>Ключи не найдены</CommandEmpty>
                    <CommandGroup>
                      {keys.map((k) => (
                        <CommandItem
                          key={k.name}
                          value={k.name}
                          onSelect={() => {
                            set("identity_file", k.path_private);
                            setKeyOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", form.identity_file === k.path_private ? "opacity-100" : "opacity-0")} />
                          {k.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setGenOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Создать новый ключ</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <Separator />
      <div className="flex justify-between px-6 py-3">
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleConnect} disabled={!form.hostname}>
                <Terminal className={cn("h-3.5 w-3.5 mr-1.5", isConnected && !isChecking ? "text-green-500" : "")} />
                Подключиться
              </Button>
            </TooltipTrigger>
            <TooltipContent>Открыть терминал с SSH-подключением</TooltipContent>
          </Tooltip>

          {isChecking ? (
            <Button variant="outline" size="sm" disabled>
              <Terminal className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
              Проверка...
            </Button>
          ) : !isConnected && form.hostname && form.identity_file ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setInstallOpen(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Установить ключ
                </Button>
              </TooltipTrigger>
              <TooltipContent>Скопировать ключ на сервер (ssh-copy-id)</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="group text-muted-foreground/50 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 overflow-hidden" disabled={!originalHost}>
                <Trash2 className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 whitespace-nowrap">Удалить</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить сервер «{form.host}»?</AlertDialogTitle>
                <AlertDialogDescription>
                  Запись будет удалена из ~/.ssh/config. Это действие нельзя отменить.
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

      {/* Install key dialog */}
      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Установить ключ на сервер</DialogTitle>
            <DialogDescription>Введите пароль для подключения к {form.hostname}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Пароль сервера</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInstall(); }}
              placeholder="Пароль пользователя на сервере" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallOpen(false)}>Отмена</Button>
            <Button onClick={handleInstall} disabled={installing}>
              {installing ? "Устанавливаю..." : "Установить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fingerprint mismatch dialog */}
      <AlertDialog open={!!fingerprintHost} onOpenChange={(o) => { if (!o) setFingerprintHost(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fingerprint сервера изменился</AlertDialogTitle>
            <AlertDialogDescription>
              Ключ хоста {fingerprintHost} в ~/.ssh/known_hosts не совпадает с текущим.
              Возможно, на сервере была переустановлена ОС. Удалить старый fingerprint и попробовать снова?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFingerprintHost("")}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFingerprint}>
              Удалить старый fingerprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <KeyGenerateModal
        open={genOpen}
        onOpenChange={setGenOpen}
        onGenerated={(name) => {
          const key = useKeysStore.getState().keys.find((k) => k.name === name);
          if (key) set("identity_file", key.path_private);
        }}
      />
    </div>
  );
}
