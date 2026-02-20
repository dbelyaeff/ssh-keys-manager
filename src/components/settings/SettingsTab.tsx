import { useSettingsStore } from "@/store/settingsStore";
import { t, Language } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Moon, Sun, Globe } from "lucide-react";

export function SettingsTab() {
    const { theme, language, setTheme, setLanguage } = useSettingsStore();

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
                </div>
            </div>
        </div>
    );
}
