import { useState, useRef } from "react";
import { useKeysStore } from "@/store/keysStore";
import { useServersStore } from "@/store/serversStore";
import { useSettingsStore } from "@/store/settingsStore";
import {
  exportArchive, importArchive, applyImport, ImportResult,
  startPeerService, stopPeerService, discoverPeers,
  initiateTransfer, sendPeerData, readKeyContent,
  getIncomingTransfers, respondToTransfer, applyReceivedData,
  Peer, IncomingTransfer,
} from "@/lib/tauri";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Download, Upload, ArchiveRestore, PackageOpen,
  Wifi, WifiOff, Monitor, RefreshCw, Send, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";

export function ExportImportTab() {
  const { keys } = useKeysStore();
  const { servers } = useServersStore();
  const { language } = useSettingsStore();

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [exporting, setExporting] = useState(false);

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importPath, setImportPath] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importSelKeys, setImportSelKeys] = useState<string[]>([]);
  const [importSelServers, setImportSelServers] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // P2P state
  const [p2pActive, setP2pActive] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [scanning, setScanning] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendPeer, setSendPeer] = useState<Peer | null>(null);
  const [p2pSelKeys, setP2pSelKeys] = useState<string[]>([]);
  const [p2pSelServers, setP2pSelServers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sentPin, setSentPin] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<IncomingTransfer[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleKey = (name: string) =>
    setSelectedKeys((prev) => prev.includes(name) ? prev.filter((k) => k !== name) : [...prev, name]);
  const toggleServer = (host: string) =>
    setSelectedServers((prev) => prev.includes(host) ? prev.filter((s) => s !== host) : [...prev, host]);

  const handleExport = async () => {
    if (exportPassword !== exportPasswordConfirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    let destPath: string | null = null;
    try {
      destPath = await saveDialog({
        filters: [{ name: "SSH Pack", extensions: ["sshpack"] }],
        defaultPath: "ssh-keys.sshpack",
      });
    } catch (e) {
      toast.error(`Ошибка открытия диалога: ${e}`);
      return;
    }
    if (!destPath) return;
    setExporting(true);
    const id = toast.loading("Создаю архив...");
    try {
      await exportArchive({
        keys: selectedKeys,
        servers: selectedServers,
        password: exportPassword || null,
        dest_path: destPath,
      });
      toast.dismiss(id);
      toast.success("Архив сохранён");
      setExportOpen(false);
      setExportPassword("");
      setExportPasswordConfirm("");
    } catch (e) {
      toast.dismiss(id);
      toast.error(`Ошибка экспорта: ${e}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePickImport = async () => {
    let file: string | null | string[] = null;
    try {
      file = await openDialog({
        filters: [{ name: "SSH Pack", extensions: ["sshpack"] }],
        multiple: false,
      });
    } catch (e) {
      toast.error(`Ошибка открытия диалога: ${e}`);
      return;
    }
    if (!file || typeof file !== "string") return;
    setImportPath(file);
    try {
      const result = await importArchive(file, null);
      setImportResult(result);
      setImportSelKeys(result.keys);
      setImportSelServers(result.servers);
      setNeedPassword(result.encrypted);
      setImportOpen(true);
    } catch (e) {
      const msg = String(e).toLowerCase();
      if (msg.includes("password") || msg.includes("encrypted")) {
        setNeedPassword(true);
        setImportOpen(true);
      } else {
        toast.error(`Ошибка чтения архива: ${e}`);
      }
    }
  };

  const handleImportWithPassword = async () => {
    try {
      const result = await importArchive(importPath, importPassword);
      setImportResult(result);
      setImportSelKeys(result.keys);
      setImportSelServers(result.servers);
      setNeedPassword(false);
    } catch (e) {
      toast.error(`Неверный пароль или ошибка: ${e}`);
    }
  };

  const handleApplyImport = async () => {
    setImporting(true);
    const id = toast.loading("Импортирую...");
    try {
      await applyImport(importPath, importPassword || null, importSelKeys, importSelServers, overwriteExisting);
      toast.dismiss(id);
      toast.success("Импорт завершён");
      setImportOpen(false);
      setImportResult(null);
      setImportPassword("");
    } catch (e) {
      toast.dismiss(id);
      toast.error(`Ошибка импорта: ${e}`);
    } finally {
      setImporting(false);
    }
  };

  // === P2P handlers ===
  const handleStartP2P = async () => {
    try {
      await startPeerService();
      setP2pActive(true);
      toast.success(t(language, "exportTab.p2pListening"));
      // Start polling for incoming transfers
      pollRef.current = setInterval(async () => {
        try {
          const transfers = await getIncomingTransfers();
          setIncoming(transfers);
        } catch { /* ignore */ }
      }, 1500);
      // Auto-discover
      handleRefreshPeers();
    } catch (e) {
      toast.error(`P2P error: ${e}`);
    }
  };

  const handleStopP2P = async () => {
    try {
      await stopPeerService();
    } catch { /* ignore */ }
    setP2pActive(false);
    setPeers([]);
    setIncoming([]);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleRefreshPeers = async () => {
    setScanning(true);
    try {
      const found = await discoverPeers();
      setPeers(found);
    } catch (e) {
      toast.error(`Discovery error: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  const handleOpenSend = (peer: Peer) => {
    setSendPeer(peer);
    setP2pSelKeys(keys.map((k) => k.name));
    setP2pSelServers(servers.map((s) => s.host));
    setSentPin(null);
    setSendOpen(true);
  };

  const handleSendData = async () => {
    if (!sendPeer) return;
    setSending(true);
    try {
      const pin = await initiateTransfer(
        sendPeer.id,
        p2pSelKeys,
        p2pSelServers
      );
      setSentPin(pin);

      // Read key contents and prepare data
      const keyTransfers = await Promise.all(
        p2pSelKeys.map(async (name) => {
          const content = await readKeyContent(name);
          return {
            name,
            private_content: content.private_content,
            public_content: content.public_content,
          };
        })
      );

      const serverTransfers = servers
        .filter((s) => p2pSelServers.includes(s.host))
        .map((s) => ({
          host: s.host,
          hostname: s.hostname,
          user: s.user,
          port: s.port,
          identity_file: s.identity_file,
        }));

      await sendPeerData(sendPeer.id, keyTransfers, serverTransfers, "direct");
      toast.success(t(language, "exportTab.p2pSent"));
    } catch (e) {
      toast.error(`Send error: ${e}`);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptIncoming = async (transfer: IncomingTransfer) => {
    try {
      await respondToTransfer(transfer.connection_id, true);
      await applyReceivedData(transfer.connection_id, false);
      toast.success(t(language, "exportTab.p2pSent"));
      setIncoming((prev) =>
        prev.filter((t) => t.connection_id !== transfer.connection_id)
      );
    } catch (e) {
      toast.error(`Accept error: ${e}`);
    }
  };

  const handleRejectIncoming = async (transfer: IncomingTransfer) => {
    try {
      await respondToTransfer(transfer.connection_id, false);
      setIncoming((prev) =>
        prev.filter((t) => t.connection_id !== transfer.connection_id)
      );
    } catch { /* ignore */ }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-xl font-semibold mb-1">{t(language, "exportTab.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(language, "exportTab.description")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Export card */}
          <div className="border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">{t(language, "exportTab.exportTitle")}</h2>
                <p className="text-xs text-muted-foreground">{t(language, "exportTab.exportDesc")}</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => {
              setSelectedKeys(keys.map((k) => k.name));
              setSelectedServers(servers.map((s) => s.host));
              setExportOpen(true);
            }}>
              <PackageOpen className="h-4 w-4 mr-2" />
              {t(language, "exportTab.exportBtn")}
            </Button>
          </div>

          {/* Import card */}
          <div className="border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">{t(language, "exportTab.importTitle")}</h2>
                <p className="text-xs text-muted-foreground">{t(language, "exportTab.importDesc")}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handlePickImport}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              {t(language, "exportTab.importBtn")}
            </Button>
          </div>
        </div>

        {/* P2P Local Network Section */}
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${p2pActive ? 'bg-green-500/10' : 'bg-muted'}`}>
                {p2pActive
                  ? <Wifi className="h-5 w-5 text-green-500" />
                  : <WifiOff className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <div>
                <h2 className="font-semibold text-sm">{t(language, "exportTab.p2pTitle")}</h2>
                <p className="text-xs text-muted-foreground">{t(language, "exportTab.p2pDesc")}</p>
              </div>
            </div>
            <Button
              variant={p2pActive ? "destructive" : "default"}
              size="sm"
              onClick={p2pActive ? handleStopP2P : handleStartP2P}
            >
              {p2pActive ? t(language, "exportTab.p2pStop") : t(language, "exportTab.p2pStart")}
            </Button>
          </div>

          {p2pActive && (
            <div className="space-y-3">
              {/* Incoming transfers */}
              {incoming.map((transfer) => (
                <div key={transfer.connection_id} className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-sm">{t(language, "exportTab.p2pIncoming")}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t(language, "exportTab.p2pFrom")}:</span>{" "}
                    <span className="font-medium">{transfer.from_name}</span>
                    <span className="text-muted-foreground ml-1">({transfer.from_ip})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {transfer.keys.map((k) => (
                      <Badge key={k} variant="secondary" className="text-xs">🔑 {k}</Badge>
                    ))}
                    {transfer.servers.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">🖥 {s}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(language, "exportTab.p2pPin")}: <span className="font-mono font-bold text-foreground text-sm">{transfer.pin}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcceptIncoming(transfer)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      {t(language, "exportTab.p2pAccept")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRejectIncoming(transfer)}>
                      {t(language, "exportTab.p2pReject")}
                    </Button>
                  </div>
                </div>
              ))}

              {/* Peer list */}
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {scanning
                    ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> {t(language, "exportTab.p2pSearching")}</span>
                    : `${peers.length} ${peers.length === 1 ? 'device' : 'devices'}`
                  }
                </Label>
                <Button variant="ghost" size="sm" onClick={handleRefreshPeers} disabled={scanning}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${scanning ? 'animate-spin' : ''}`} />
                  {t(language, "exportTab.p2pRefresh")}
                </Button>
              </div>

              {peers.length === 0 && !scanning && (
                <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
                  <Monitor className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {t(language, "exportTab.p2pNoPeers")}
                </div>
              )}

              {peers.length === 0 && !scanning && incoming.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t(language, "exportTab.p2pListening")}
                </div>
              )}

              <div className="space-y-2">
                {peers.map((peer) => (
                  <div
                    key={peer.id}
                    className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-green-500/10">
                        <Monitor className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{peer.name}</p>
                        <p className="text-xs text-muted-foreground">{peer.ip}:{peer.port}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleOpenSend(peer)}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {t(language, "exportTab.p2pSend")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Экспорт данных</DialogTitle>
            <DialogDescription>Выберите что включить в архив</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SSH-ключи</Label>
                <button className="text-xs text-primary" onClick={() =>
                  setSelectedKeys(selectedKeys.length === keys.length ? [] : keys.map((k) => k.name))
                }>
                  {selectedKeys.length === keys.length ? "Снять все" : "Выбрать все"}
                </button>
              </div>
              {keys.map((k) => (
                <div key={k.name} className="flex items-center gap-2">
                  <Checkbox checked={selectedKeys.includes(k.name)} onCheckedChange={() => toggleKey(k.name)} />
                  <label className="text-sm cursor-pointer" onClick={() => toggleKey(k.name)}>{k.name}</label>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Серверы</Label>
                <button className="text-xs text-primary" onClick={() =>
                  setSelectedServers(selectedServers.length === servers.length ? [] : servers.map((s) => s.host))
                }>
                  {selectedServers.length === servers.length ? "Снять все" : "Выбрать все"}
                </button>
              </div>
              {servers.map((s) => (
                <div key={s.host} className="flex items-center gap-2">
                  <Checkbox checked={selectedServers.includes(s.host)} onCheckedChange={() => toggleServer(s.host)} />
                  <label className="text-sm cursor-pointer" onClick={() => toggleServer(s.host)}>{s.host}</label>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Защита паролем</Label>
              <div className="space-y-1.5">
                <Label>Пароль <span className="text-muted-foreground">(необязательно)</span></Label>
                <Input type="password" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} placeholder="Оставьте пустым для без шифрования" />
              </div>
              {exportPassword && (
                <div className="space-y-1.5">
                  <Label>Повторите пароль</Label>
                  <Input type="password" value={exportPasswordConfirm} onChange={(e) => setExportPasswordConfirm(e.target.value)} />
                </div>
              )}
              {exportPassword && <p className="text-xs text-muted-foreground">Шифрование: AES-256-GCM + Argon2id (устойчиво к брутфорсу)</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Отмена</Button>
            <Button onClick={handleExport} disabled={exporting || (!selectedKeys.length && !selectedServers.length)}>
              {exporting ? "Экспортирую..." : "Экспортировать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Импорт данных</DialogTitle>
            <DialogDescription>{importPath}</DialogDescription>
          </DialogHeader>
          {needPassword && !importResult ? (
            <div className="space-y-3 py-2">
              <Label>Пароль архива</Label>
              <Input type="password" value={importPassword} onChange={(e) => setImportPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleImportWithPassword(); }} />
              <Button onClick={handleImportWithPassword} className="w-full">Расшифровать</Button>
            </div>
          ) : importResult ? (
            <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto">
              {importResult.keys.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SSH-ключи</Label>
                  {importResult.keys.map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <Checkbox checked={importSelKeys.includes(k)} onCheckedChange={() =>
                        setImportSelKeys((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])
                      } />
                      <label className="text-sm">{k}</label>
                    </div>
                  ))}
                </div>
              )}
              {importResult.servers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Серверы</Label>
                  {importResult.servers.map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <Checkbox checked={importSelServers.includes(s)} onCheckedChange={() =>
                        setImportSelServers((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
                      } />
                      <label className="text-sm">{s}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          {importResult && (
            <div className="py-2">
              <div className="flex items-center gap-2 mb-2 p-3 border rounded-md bg-muted/50">
                <Checkbox id="overwrite" checked={overwriteExisting} onCheckedChange={(checked) => setOverwriteExisting(checked as boolean)} />
                <label htmlFor="overwrite" className="text-sm font-medium cursor-pointer">
                  {t(language, "exportTab.overwrite")}
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {overwriteExisting ? t(language, "exportTab.overwriteDesc") : t(language, "exportTab.skipDesc")}
              </p>
            </div>
          )}
          {importResult && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>Отмена</Button>
              <Button onClick={handleApplyImport} disabled={importing}>
                {importing ? "Импортирую..." : "Импортировать выбранное"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* P2P Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t(language, "exportTab.p2pSend")} → {sendPeer?.name}
            </DialogTitle>
            <DialogDescription>
              {sendPeer?.ip}:{sendPeer?.port} — {t(language, "exportTab.p2pSelectData")}
            </DialogDescription>
          </DialogHeader>

          {sentPin ? (
            <div className="py-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t(language, "exportTab.p2pPin")}</p>
                <p className="text-4xl font-mono font-bold tracking-[0.3em]">{sentPin}</p>
              </div>
              <p className="text-xs text-muted-foreground">{t(language, "exportTab.p2pPinHint")}</p>
            </div>
          ) : (
            <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SSH-ключи</Label>
                  <button className="text-xs text-primary" onClick={() =>
                    setP2pSelKeys(p2pSelKeys.length === keys.length ? [] : keys.map((k) => k.name))
                  }>
                    {p2pSelKeys.length === keys.length ? "Снять все" : "Выбрать все"}
                  </button>
                </div>
                {keys.map((k) => (
                  <div key={k.name} className="flex items-center gap-2">
                    <Checkbox
                      checked={p2pSelKeys.includes(k.name)}
                      onCheckedChange={() =>
                        setP2pSelKeys((prev) => prev.includes(k.name) ? prev.filter((x) => x !== k.name) : [...prev, k.name])
                      }
                    />
                    <label className="text-sm cursor-pointer" onClick={() =>
                      setP2pSelKeys((prev) => prev.includes(k.name) ? prev.filter((x) => x !== k.name) : [...prev, k.name])
                    }>{k.name}</label>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Серверы</Label>
                  <button className="text-xs text-primary" onClick={() =>
                    setP2pSelServers(p2pSelServers.length === servers.length ? [] : servers.map((s) => s.host))
                  }>
                    {p2pSelServers.length === servers.length ? "Снять все" : "Выбрать все"}
                  </button>
                </div>
                {servers.map((s) => (
                  <div key={s.host} className="flex items-center gap-2">
                    <Checkbox
                      checked={p2pSelServers.includes(s.host)}
                      onCheckedChange={() =>
                        setP2pSelServers((prev) => prev.includes(s.host) ? prev.filter((x) => x !== s.host) : [...prev, s.host])
                      }
                    />
                    <label className="text-sm cursor-pointer" onClick={() =>
                      setP2pSelServers((prev) => prev.includes(s.host) ? prev.filter((x) => x !== s.host) : [...prev, s.host])
                    }>{s.host}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              {sentPin ? "OK" : "Отмена"}
            </Button>
            {!sentPin && (
              <Button onClick={handleSendData} disabled={sending || (!p2pSelKeys.length && !p2pSelServers.length)}>
                {sending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t(language, "exportTab.p2pSending")}</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> {t(language, "exportTab.p2pSend")}</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
