import { create } from "zustand";
import { Language } from "@/lib/i18n";

export type Theme = "system" | "light" | "dark";
export type TerminalApp = "Terminal.app" | "iTerm.app" | "Warp.app";

interface SettingsState {
    theme: Theme;
    language: Language;
    terminal: TerminalApp;
    setTheme: (theme: Theme) => void;
    setLanguage: (lang: Language) => void;
    setTerminal: (term: TerminalApp) => void;
}

const savedTheme = (localStorage.getItem("settings_theme") as Theme) || "system";
const savedLang = (localStorage.getItem("settings_language") as Language) || "ru";
const savedTerminal = (localStorage.getItem("settings_terminal") as TerminalApp) || "Terminal.app";

export const useSettingsStore = create<SettingsState>((set) => ({
    theme: savedTheme,
    language: savedLang,
    terminal: savedTerminal,
    setTheme: (theme) => {
        localStorage.setItem("settings_theme", theme);
        set({ theme });
    },
    setLanguage: (language) => {
        localStorage.setItem("settings_language", language);
        set({ language });
    },
    setTerminal: (terminal) => {
        localStorage.setItem("settings_terminal", terminal);
        set({ terminal });
    },
}));
