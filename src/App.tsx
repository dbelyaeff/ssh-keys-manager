import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeysTab } from "@/components/keys/KeysTab";
import { ServersTab } from "@/components/servers/ServersTab";
import { ExportImportTab } from "@/components/export-import/ExportImportTab";
import { SettingsTab } from "@/components/settings/SettingsTab";
import { ExportDialog } from "@/components/export-import/ExportDialog";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { t } from "@/lib/i18n";
import { Monitor, Sun, Moon } from "lucide-react";

export default function App() {
  const { activeTab, setActiveTab } = useUIStore();
  const { theme, language, setTheme } = useSettingsStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Handle system theme updates
  useEffect(() => {
    if (theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground">
        <div className="flex items-center justify-between px-4 pt-4 pb-4 border-b bg-background/95 backdrop-blur">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-0 overflow-x-auto flex-nowrap w-full justify-start sm:w-auto h-auto min-h-10 py-1">
              <TabsTrigger value="keys">{t(language, "tabs.keys")}</TabsTrigger>
              <TabsTrigger value="servers">{t(language, "tabs.servers")}</TabsTrigger>
              <TabsTrigger value="export">{t(language, "tabs.export")}</TabsTrigger>
              <TabsTrigger value="settings">{t(language, "tabs.settings")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setTheme("system")}
              className={`p-2 rounded-md transition-colors ${theme === "system" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              title={t(language, "settingsTab.themeSystem")}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`p-2 rounded-md transition-colors ${theme === "light" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              title={t(language, "settingsTab.themeLight")}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`p-2 rounded-md transition-colors ${theme === "dark" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
              title={t(language, "settingsTab.themeDark")}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {activeTab === "keys" && <KeysTab />}
          {activeTab === "servers" && <ServersTab />}
          {activeTab === "export" && <ExportImportTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </div>
      <ExportDialog />
      <Toaster richColors position="bottom-right" theme={theme} />
    </TooltipProvider>
  );
}
