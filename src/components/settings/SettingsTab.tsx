import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { t, Language } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Moon, Sun, Globe, Terminal, Info, RefreshCw, LayoutTemplate } from "lucide-react";
import { TerminalApp } from "@/store/settingsStore";
import { checkInstalledTerminals, getWslDistros, syncToWsl, WslDistro, isWindows as isWindowsCmd } from "@/lib/tauri";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsTab() {
    const { theme, language, terminal, wslEnabled, wslDistro, setTheme, setLanguage, setTerminal, setWslEnabled, setWslDistro } = useSettingsStore();
    const [installedTerminals, setInstalledTerminals] = useState<string[]>(["Terminal.app"]);
    const [wslDistros, setWslDistros] = useState<WslDistro[]>([]);
    const [isWindows, setIsWindows] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        checkInstalledTerminals().then(terms => setInstalledTerminals(terms)).catch(console.error);
        
        isWindowsCmd().then(win => {
            if (win) {
                setIsWindows(true);
                getWslDistros().then(distros => {
                    setWslDistros(distros);
                    if (distros.length > 0 && !wslDistro) {
                        setWslDistro(distros[0].name);
                    }
                }).catch(err => {
                    console.log("WSL not available or failed to list:", err);
                });
            }
        });
    }, [setWslDistro, wslDistro]);

    const handleSync = async () => {
        if (!wslDistro) return;
        setSyncing(true);
        try {
            await syncToWsl(wslDistro);
            toast.success(t(language, "settingsTab.wslSyncSuccess") || "Синхронизировано с WSL");
        } catch (err) {
            toast.error(`Sync error: ${err}`);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-xl font-semibold mb-1">{t(language, "settingsTab.title")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t(language, "settingsTab.description")}
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wider flex items-center gap-2">
                            <Monitor className="w-4 h-4" /> {t(language, "settingsTab.theme")}
                        </Label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setTheme("system")}
                                className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-colors border-2 ${theme === "system" ? "border-primary bg-primary/5" : "hover:bg-muted"
                                    }`}
                            >
                                <Monitor className="w-6 h-6 mb-2" />
                                <span className="text-sm font-medium">{t(language, "settingsTab.themeSystem")}</span>
                            </button>
                            <button
                                onClick={() => setTheme("light")}
                                className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-colors border-2 ${theme === "light" ? "border-primary bg-primary/5" : "hover:bg-muted"
                                    }`}
                            >
                                <Sun className="w-6 h-6 mb-2" />
                                <span className="text-sm font-medium">{t(language, "settingsTab.themeLight")}</span>
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={`flex flex-col items-center justify-center p-4 border rounded-lg transition-colors border-2 ${theme === "dark" ? "border-primary bg-primary/5" : "hover:bg-muted"
                                    }`}
                            >
                                <Moon className="w-6 h-6 mb-2" />
                                <span className="text-sm font-medium">{t(language, "settingsTab.themeDark")}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wider flex items-center gap-2">
                            <Globe className="w-4 h-4" /> {t(language, "settingsTab.language")}
                        </Label>
                        <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                            <SelectTrigger className="w-full sm:w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ru">{t(language, "settingsTab.langRu")}</SelectItem>
                                <SelectItem value="en">{t(language, "settingsTab.langEn")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wider flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> {t(language, "settingsTab.terminal") || "Терминал по умолчанию"}
                        </Label>
                        <Select value={terminal} onValueChange={(val) => setTerminal(val as TerminalApp)}>
                            <SelectTrigger className="w-full sm:w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {installedTerminals.includes("Terminal.app") && <SelectItem value="Terminal.app">Terminal.app (macOS)</SelectItem>}
                                {installedTerminals.includes("iTerm.app") && <SelectItem value="iTerm.app">iTerm2</SelectItem>}
                                {installedTerminals.includes("Warp.app") && <SelectItem value="Warp.app">Warp</SelectItem>}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Используется при открытии соединения (Подключиться).</p>
                    </div>

                    {isWindows && (
                        <div className="space-y-4 pt-2 pb-2">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wider flex items-center gap-2">
                                        <LayoutTemplate className="w-4 h-4" /> {t(language, "settingsTab.wsl")}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">{t(language, "settingsTab.wslDesc")}</p>
                                </div>
                                <Checkbox 
                                    id="wsl-toggle"
                                    checked={wslEnabled} 
                                    onCheckedChange={(checked) => setWslEnabled(!!checked)} 
                                />
                            </div>

                            {wslEnabled && (
                                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                    <Select value={wslDistro} onValueChange={setWslDistro}>
                                        <SelectTrigger className="w-full sm:w-64">
                                            <SelectValue placeholder={t(language, "settingsTab.wslNoDistros")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {wslDistros.map(d => (
                                                <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="gap-2"
                                        onClick={handleSync}
                                        disabled={syncing || !wslDistro}
                                    >
                                        <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                                        {t(language, "settingsTab.wslSync")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    <Separator />

                    <div className="space-y-3">
                        <Label className="uppercase text-xs font-semibold text-muted-foreground tracking-wider flex items-center gap-2">
                            <Info className="w-4 h-4" /> {t(language, "settingsTab.about")}
                        </Label>
                        <div className="rounded-lg border bg-muted/30 p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <img src="/src-tauri/icons/icon.png" alt="Logo" className="w-12 h-12 rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <div>
                                    <h3 className="font-semibold text-base">SSH Keys Manager</h3>
                                    <p className="text-xs text-muted-foreground">{t(language, "settingsTab.version")} 1.0.3</p>
                                </div>
                            </div>
                            <div className="text-sm space-y-1.5">
                                <p className="text-muted-foreground">{t(language, "settingsTab.techStack")}:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {["Tauri 2", "React 18", "TypeScript", "Rust", "TailwindCSS", "ShadCN/UI", "Zustand", "AES-256-GCM"].map((tech) => (
                                        <span key={tech} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="text-sm space-y-1">
                                <p>
                                    <span className="text-muted-foreground">{t(language, "settingsTab.author")}:</span>{" "}
                                    <span className="font-medium">{t(language, "settingsTab.authorName")}</span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">{t(language, "settingsTab.license")}:</span>{" "}
                                    <span className="font-medium">MIT</span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">GitHub:</span>{" "}
                                    <a
                                        href="https://github.com/dbelyaeff/ssh-keys-manager"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        dbelyaeff/ssh-keys-manager
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
