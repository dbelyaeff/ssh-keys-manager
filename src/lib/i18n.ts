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
            p2pTitle: "Локальная сеть",
            p2pDesc: "Передача ключей и серверов на другой компьютер по P2P",
            p2pStart: "Включить обнаружение",
            p2pStop: "Отключить",
            p2pSearching: "Поиск устройств...",
            p2pNoPeers: "Устройства не найдены. Убедитесь, что SSH Keys Manager запущен на другом компьютере в этой сети.",
            p2pSend: "Отправить",
            p2pRefresh: "Обновить",
            p2pPin: "PIN-код",
            p2pPinHint: "Сообщите этот PIN получателю для подтверждения",
            p2pSending: "Отправка...",
            p2pSent: "Данные отправлены!",
            p2pSelectData: "Выберите данные для отправки",
            p2pIncoming: "Входящая передача",
            p2pFrom: "От",
            p2pAccept: "Принять",
            p2pReject: "Отклонить",
            p2pListening: "Ожидание подключений...",
            deviceFound: "устройство",
            devicesFound: "устройств(а)",
        },
        settingsTab: {
            title: "Настройки",
            description: "Персонализация внешнего вида и языка интерфейса",
            theme: "Оформление",
            terminal: "Терминал по умолчанию",
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
            p2pTitle: "Local Network",
            p2pDesc: "Transfer keys and servers to another computer via P2P",
            p2pStart: "Enable Discovery",
            p2pStop: "Disable",
            p2pSearching: "Searching for devices...",
            p2pNoPeers: "No devices found. Make sure SSH Keys Manager is running on another computer in this network.",
            p2pSend: "Send",
            p2pRefresh: "Refresh",
            p2pPin: "PIN Code",
            p2pPinHint: "Share this PIN with the recipient for confirmation",
            p2pSending: "Sending...",
            p2pSent: "Data sent!",
            p2pSelectData: "Select data to send",
            p2pIncoming: "Incoming Transfer",
            p2pFrom: "From",
            p2pAccept: "Accept",
            p2pReject: "Reject",
            p2pListening: "Waiting for connections...",
            deviceFound: "device",
            devicesFound: "devices",
        },
        settingsTab: {
            title: "Settings",
            description: "Personalize appearance and interface language",
            theme: "Theme",
            terminal: "Default Terminal",
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
