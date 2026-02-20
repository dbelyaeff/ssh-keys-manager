export type Language = "ru" | "en";

export const translations = {
    ru: {
        tabs: {
            keys: "SSH-ключи",
            servers: "Серверы",
            export: "Экспорт / Импорт",
            settings: "Настройки",
        },
        exportTab: {
            title: "Экспорт и Импорт",
            description: "Сохраняйте и восстанавливайте SSH-ключи и серверные профили в зашифрованный архив .sshpack",
            exportTitle: "Экспорт",
            exportDesc: "Сохранить ключи и серверы в архив",
            exportBtn: "Экспортировать...",
            importTitle: "Импорт",
            importDesc: "Восстановить из архива .sshpack",
            importBtn: "Выбрать файл...",
            overwrite: "Перезаписать существующие",
            overwriteDesc: "Если ключи или серверы уже есть, они будут перезаписаны. Старые версии будут потеряны.",
            skipDesc: "Если ключи или серверы уже есть, они останутся без изменений (режим пропуска).",
        },
        settingsTab: {
            title: "Настройки",
            description: "Персонализация внешнего вида и языка интерфейса",
            theme: "Оформление",
            themeSystem: "Системное",
            themeLight: "Светлое",
            themeDark: "Тёмное",
            language: "Язык интерфейса",
            langRu: "Русский",
            langEn: "English",
            about: "О программе",
            version: "Версия",
            techStack: "Технологии",
            author: "Автор",
            authorName: "Д.П. Беляев",
            license: "Лицензия",
        }
    },
    en: {
        tabs: {
            keys: "SSH Keys",
            servers: "Servers",
            export: "Export / Import",
            settings: "Settings",
        },
        exportTab: {
            title: "Export & Import",
            description: "Save and restore SSH keys and server profiles in an encrypted .sshpack archive",
            exportTitle: "Export",
            exportDesc: "Save keys and servers to archive",
            exportBtn: "Export...",
            importTitle: "Import",
            importDesc: "Restore from .sshpack archive",
            importBtn: "Select File...",
            overwrite: "Overwrite existing",
            overwriteDesc: "If keys or servers already exist, they will be overwritten. Old versions will be lost.",
            skipDesc: "If keys or servers already exist, they will be kept unchanged (skip mode).",
        },
        settingsTab: {
            title: "Settings",
            description: "Personalize appearance and interface language",
            theme: "Theme",
            themeSystem: "System",
            themeLight: "Light",
            themeDark: "Dark",
            language: "Interface Language",
            langRu: "Русский",
            langEn: "English",
            about: "About",
            version: "Version",
            techStack: "Technologies",
            author: "Author",
            authorName: "D.P. Belyaev",
            license: "License",
        }
    }
};

export function t(lang: Language, keyPath: string): string {
    const keys = keyPath.split('.');
    let obj: any = translations[lang];
    for (const key of keys) {
        if (obj && typeof obj === 'object') {
            obj = obj[key];
        } else {
            return keyPath;
        }
    }
    return typeof obj === 'string' ? obj : keyPath;
}
