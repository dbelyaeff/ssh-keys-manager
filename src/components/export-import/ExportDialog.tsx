import { useState, useEffect } from "react";
import { useKeysStore } from "@/store/keysStore";
import { useServersStore } from "@/store/serversStore";
import { useUIStore } from "@/store/uiStore";
import { toast } from "sonner";
import { exportArchive } from "@/lib/tauri";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export function ExportDialog() {
    const { keys } = useKeysStore();
    const { servers } = useServersStore();

    const { exportDialogOpen, closeExportDialog, exportPreselectedKeys, exportPreselectedServers } = useUIStore();

    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [selectedServers, setSelectedServers] = useState<string[]>([]);
    const [exportPassword, setExportPassword] = useState("");
    const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
    const [exporting, setExporting] = useState(false);

    const toggleKey = (name: string) =>
        setSelectedKeys((prev) => prev.includes(name) ? prev.filter((k) => k !== name) : [...prev, name]);
    const toggleServer = (host: string) =>
        setSelectedServers((prev) => prev.includes(host) ? prev.filter((s) => s !== host) : [...prev, host]);

    useEffect(() => {
        if (exportDialogOpen) {
            if (exportPreselectedKeys) {
                setSelectedKeys(exportPreselectedKeys);
            } else {
                setSelectedKeys(keys.map(k => k.name));
            }
            if (exportPreselectedServers) {
                setSelectedServers(exportPreselectedServers);
            } else {
                setSelectedServers(servers.map(s => s.host));
            }
            setExportPassword("");
            setExportPasswordConfirm("");
        }
    }, [exportDialogOpen, exportPreselectedKeys, exportPreselectedServers, keys, servers]);

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
            closeExportDialog();
        } catch (e) {
            toast.dismiss(id);
            toast.error(`Ошибка экспорта: ${e}`);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Dialog open={exportDialogOpen} onOpenChange={closeExportDialog}>
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
                    <Button variant="outline" onClick={() => closeExportDialog()}>Отмена</Button>
                    <Button onClick={handleExport} disabled={exporting || (!selectedKeys.length && !selectedServers.length)}>
                        {exporting ? "Экспортирую..." : "Экспортировать"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
