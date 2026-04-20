import { useState, useEffect } from "react";
import { useServersStore } from "@/store/serversStore";
import { useKeysStore } from "@/store/keysStore";
import { useSettingsStore } from "@/store/settingsStore";
import { saveServer } from "@/lib/tauri";
import { t } from "@/lib/i18n";
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
    const language = useSettingsStore((s) => s.language);
    const [host, setHost] = useState("");
    const [hostname, setHostname] = useState("");
    const [user, setUser] = useState("root");
    const [port, setPort] = useState(22);
    const [identityFile, setIdentityFile] = useState("");
    const [saving, setSaving] = useState(false);

    const [keyOpen, setKeyOpen] = useState(false);
    const [genOpen, setGenOpen] = useState(false);

    const { servers } = useServersStore();
    const isDuplicate = host.trim() !== "" && servers.some(s => s.host.toLowerCase() === host.trim().toLowerCase());

    useEffect(() => {
        if (open) {
            loadKeys();
        }
    }, [open, loadKeys]);

    useEffect(() => {
        if (!isDuplicate) {
            toast.dismiss("duplicate-host-error");
            return;
        }
        const timer = setTimeout(() => {
            toast.error(t(language, "servers.duplicateHost"), { id: "duplicate-host-error" });
        }, 500);
        return () => clearTimeout(timer);
    }, [host, isDuplicate, language]);

    const handleCreate = async () => {
        if (!host.trim()) {
            toast.error(t(language, "servers.noHostError"));
            return;
        }

        const { servers } = useServersStore.getState();
        if (servers.find(s => s.host === host.trim())) {
            toast.error(t(language, "servers.duplicateHost"));
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
            toast.success(t(language, "servers.saved", { name: host.trim() }));
            await loadServers();
            selectServer(host.trim());
            onOpenChange(false);
            setHost("");
            setHostname("");
            setUser("root");
            setPort(22);
            setIdentityFile("");
        } catch (e) {
            toast.error(`${t(language, "common.error")}: ${e}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t(language, "servers.newServer")}</DialogTitle>
                    <DialogDescription>{t(language, "servers.deleteDesc")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>{t(language, "servers.hostLabel")} <span className="text-muted-foreground">{t(language, "servers.hostHint")}</span></Label>
                            <Input
                                placeholder="my-server"
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                                className={cn(isDuplicate && "text-destructive border-destructive focus-visible:ring-destructive")}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t(language, "servers.hostnameLabel")} <span className="text-muted-foreground">{t(language, "servers.hostnameHint")}</span></Label>
                            <Input
                                placeholder="192.168.1.1"
                                value={hostname}
                                onChange={(e) => setHostname(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>{t(language, "servers.userLabel")}</Label>
                            <Input
                                placeholder="root"
                                value={user}
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t(language, "servers.portLabel")}</Label>
                            <Input
                                type="number"
                                placeholder="22"
                                value={port}
                                onChange={(e) => setPort(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t(language, "servers.identityFileLabel")} <span className="text-muted-foreground">{t(language, "servers.hostHint")}</span></Label>
                        <div className="flex gap-2">
                            <Popover open={keyOpen} onOpenChange={setKeyOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                                        <span className="truncate">{identityFile || t(language, "servers.identityFilePrompt")}</span>
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
                                <TooltipContent>{t(language, "keys.generate")}</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t(language, "common.cancel")}</Button>
                    <Button onClick={handleCreate} disabled={saving || isDuplicate}>
                        {saving ? t(language, "common.saving") : t(language, "common.save")}
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
