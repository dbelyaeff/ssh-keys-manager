import { useState, useEffect } from "react";
import { useServersStore } from "@/store/serversStore";
import { useKeysStore } from "@/store/keysStore";
import { useSettingsStore } from "@/store/settingsStore";
import { saveServer, deleteServer, connectToServer, installKeyToServer, removeKnownHost, checkServerConnection } from "@/lib/tauri";
import { t } from "@/lib/i18n";
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
  const language = useSettingsStore((s) => s.language);
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

  const isDuplicate = form.host.trim() !== "" &&
    form.host.trim().toLowerCase() !== originalHost.toLowerCase() &&
    servers.some(s => s.host.toLowerCase() === form.host.trim().toLowerCase());

  useEffect(() => {
    if (srv) {
      setForm({ ...srv });
      setOriginalHost(srv.host);
      setIsConnected(false);
      toast.dismiss("duplicate-host-error");
    }
  }, [srv, selectedServer]);

  useEffect(() => {
    if (!isDuplicate) {
      toast.dismiss("duplicate-host-error");
      return;
    }
    const timer = setTimeout(() => {
      toast.error(t(language, "servers.duplicateHost"), { id: "duplicate-host-error" });
    }, 500);
    return () => clearTimeout(timer);
  }, [form.host, isDuplicate, language]);

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
        <p className="text-sm">{t(language, "servers.selectPrompt")}</p>
      </div>
    );
  }

  const set = (field: keyof ServerConfig, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.host.trim()) { toast.error(t(language, "servers.noHostError")); return; }

    const { servers } = useServersStore.getState();
    if (form.host.trim() !== originalHost && servers.find(s => s.host === form.host.trim())) {
      toast.error(t(language, "servers.duplicateHost"));
      return;
    }

    setSaving(true);
    try {
      await saveServer(originalHost, form);
      toast.success(t(language, "servers.saved", { name: form.host }));
      await loadServers();
      selectServer(form.host);
    } catch (e) {
      toast.error(`${t(language, "common.error")}: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteServer(form.host);
      toast.success(t(language, "servers.deleted", { name: form.host }));
      await loadServers();
    } catch (e) {
      toast.error(`${t(language, "common.error")}: ${e}`);
    }
  };

  const handleConnect = async () => {
    try {
      await connectToServer(form, terminal);
      toast.success(t(language, "servers.terminalOpened"));
    } catch (e) {
      toast.error(`${t(language, "common.error")}: ${e}`);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    const id = toast.loading(t(language, "servers.installing"));
    try {
      await installKeyToServer(form, password);
      toast.dismiss(id);
      toast.success(t(language, "servers.installed"));
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
        toast.error(`${t(language, "common.error")}: ${msg}`);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleRemoveFingerprint = async () => {
    try {
      await removeKnownHost(fingerprintHost);
      toast.success(t(language, "servers.fingerprintRemove") + " " + t(language, "common.success"));
      setFingerprintHost("");
    } catch (e) {
      toast.error(`${t(language, "common.error")}: ${e}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b">
        <h2 className="font-semibold text-sm">{form.host || t(language, "servers.newServer")}</h2>
        {form.hostname && <span className="text-xs text-muted-foreground">{form.hostname}</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t(language, "servers.hostLabel")} <span className="text-muted-foreground">{t(language, "servers.hostHint")}</span></Label>
            <Input
              value={form.host}
              onChange={(e) => set("host", e.target.value)}
              placeholder="my-server"
              className={cn(isDuplicate && "text-destructive border-destructive focus-visible:ring-destructive")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t(language, "servers.hostnameLabel")} <span className="text-muted-foreground">{t(language, "servers.hostnameHint")}</span></Label>
            <Input value={form.hostname} onChange={(e) => set("hostname", e.target.value)} placeholder="192.168.1.1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t(language, "servers.userLabel")}</Label>
            <Input value={form.user} onChange={(e) => set("user", e.target.value)} placeholder="root" />
          </div>
          <div className="space-y-1.5">
            <Label>{t(language, "servers.portLabel")}</Label>
            <Input type="number" value={form.port} onChange={(e) => set("port", Number(e.target.value))} placeholder="22" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t(language, "servers.identityFileLabel")} <span className="text-muted-foreground">{t(language, "servers.hostHint")}</span></Label>
          <div className="flex gap-2">
            <Popover open={keyOpen} onOpenChange={setKeyOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                  <span className="truncate">{form.identity_file || t(language, "servers.identityFilePrompt")}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder={t(language, "common.search")} />
                  <CommandList>
                    <CommandEmpty>{t(language, "common.noResults")}</CommandEmpty>
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
              <TooltipContent>{t(language, "keys.generate")}</TooltipContent>
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
                {t(language, "servers.connect")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t(language, "servers.connectHint")}</TooltipContent>
          </Tooltip>

          {isChecking ? (
            <Button variant="outline" size="sm" disabled>
              <Terminal className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
              {t(language, "servers.checking")}
            </Button>
          ) : !isConnected && form.hostname && form.identity_file ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setInstallOpen(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  {t(language, "servers.installKey")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t(language, "servers.installKeyHint")}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="group text-muted-foreground/50 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 overflow-hidden" disabled={!originalHost}>
                <Trash2 className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 whitespace-nowrap">
                    {t(language, "common.delete")}
                </span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(language, "servers.deleteTitle", { name: form.host })}</AlertDialogTitle>
                <AlertDialogDescription>
                   {t(language, "servers.deleteDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t(language, "common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t(language, "common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={handleSave} disabled={saving || isDuplicate}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? t(language, "common.saving") : t(language, "common.save")}
          </Button>
        </div>
      </div>

      {/* Install key dialog */}
      <Dialog open={installOpen} onOpenChange={setInstallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t(language, "servers.passwordTitle")}</DialogTitle>
            <DialogDescription>{t(language, "servers.passwordPrompt", { hostname: form.hostname })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t(language, "servers.serverPassword")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInstall(); }}
              placeholder={t(language, "servers.passwordPlaceholder")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallOpen(false)}>{t(language, "common.cancel")}</Button>
            <Button onClick={handleInstall} disabled={installing}>
              {installing ? t(language, "servers.installing") : t(language, "servers.installKey")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fingerprint mismatch dialog */}
      <AlertDialog open={!!fingerprintHost} onOpenChange={(o) => { if (!o) setFingerprintHost(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(language, "servers.fingerprintTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(language, "servers.fingerprintDesc", { hostname: fingerprintHost })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFingerprintHost("")}>{t(language, "common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFingerprint}>
               {t(language, "servers.fingerprintRemove")}
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
