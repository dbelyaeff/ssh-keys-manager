import { useState } from "react";
import { useKeysStore } from "@/store/keysStore";
import { useServersStore } from "@/store/serversStore";
import { useSettingsStore } from "@/store/settingsStore";
import { exportArchive, importArchive, applyImport, ImportResult } from "@/lib/tauri";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Download, Upload, ArchiveRestore, PackageOpen } from "lucide-react";

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
    </div>
  );
}
