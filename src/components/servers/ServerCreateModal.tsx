import { useState, useEffect } from "react";
import { useServersStore } from "@/store/serversStore";
import { useKeysStore } from "@/store/keysStore";
import { saveServer } from "@/lib/tauri";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyGenerateModal } from "@/components/keys/KeyGenerateModal";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ServerCreateModal({ open, onOpenChange }: Props) {
    const { loadServers, selectServer } = useServersStore();
    const { keys, loadKeys } = useKeysStore();
    const [host, setHost] = useState("");
    const [hostname, setHostname] = useState("");
    const [user, setUser] = useState("root");
    const [port, setPort] = useState(22);
    const [identityFile, setIdentityFile] = useState("");
    const [saving, setSaving] = useState(false);

    const [keyOpen, setKeyOpen] = useState(false);
    const [genOpen, setGenOpen] = useState(false);

    useEffect(() => {
        if (open) {
            loadKeys();
        }
    }, [open, loadKeys]);

    const handleCreate = async () => {
        if (!host.trim()) {
            toast.error("Укажите псевдоним хоста (Host)");
            return;
        }

        const { servers } = useServersStore.getState();
        if (servers.find(s => s.host === host.trim())) {
            toast.error(`Хост «${host.trim()}» уже существует`);
            return;
        }

        setSaving(true);
        try {
            await saveServer("", {
                host: host.trim(),
                hostname: hostname.trim(),
                user: user.trim(),
                port: port,
                identity_file: identityFile
            });
            toast.success(`Сервер «${host.trim()}» создан`);
            await loadServers();
            selectServer(host.trim());
            onOpenChange(false);
            setHost("");
            setHostname("");
            setUser("root");
            setPort(22);
            setIdentityFile("");
        } catch (e) {
            toast.error(`Ошибка создания: ${e}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Новый сервер</DialogTitle>
                    <DialogDescription>Добавление конфигурации в ~/.ssh/config</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Host <span className="text-muted-foreground">(псевдоним)</span></Label>
                            <Input
                                placeholder="my-server"
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>HostName <span className="text-muted-foreground">(IP или домен)</span></Label>
                            <Input
                                placeholder="192.168.1.1"
                                value={hostname}
                                onChange={(e) => setHostname(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>User</Label>
                            <Input
                                placeholder="root"
                                value={user}
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Port</Label>
                            <Input
                                type="number"
                                placeholder="22"
                                value={port}
                                onChange={(e) => setPort(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>IdentityFile <span className="text-muted-foreground">(SSH-ключ)</span></Label>
                        <div className="flex gap-2">
                            <Popover open={keyOpen} onOpenChange={setKeyOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                                        <span className="truncate">{identityFile || "Выберите ключ..."}</span>
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
                                                            setIdentityFile(k.path_private);
                                                            setKeyOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", identityFile === k.path_private ? "opacity-100" : "opacity-0")} />
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

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button onClick={handleCreate} disabled={saving}>
                        {saving ? "Создаю..." : "Создать"}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <KeyGenerateModal
                open={genOpen}
                onOpenChange={setGenOpen}
                onGenerated={(name) => {
                    const key = useKeysStore.getState().keys.find((k) => k.name === name);
                    if (key) setIdentityFile(key.path_private);
                }}
            />
        </Dialog>
    );
}
