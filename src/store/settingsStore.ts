import { create } from "zustand";
import { Language } from "@/lib/i18n";

export type Theme = "system" | "light" | "dark";

interface SettingsState {
    theme: Theme;
    language: Language;
    setTheme: (theme: Theme) => void;
    setLanguage: (lang: Language) => void;
}

const savedTheme = (localStorage.getItem("settings_theme") as Theme) || "system";
const savedLang = (localStorage.getItem("settings_language") as Language) || "ru";

export const useSettingsStore = create<SettingsState>((set) => ({
    theme: savedTheme,
    language: savedLang,
    setTheme: (theme) => {
        localStorage.setItem("settings_theme", theme);
        set({ theme });
    },
    setLanguage: (language) => {
        localStorage.setItem("settings_language", language);
        set({ language });
    },
}));
