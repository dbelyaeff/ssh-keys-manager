# SSH Keys Manager — macOS Application

## Обзор

Приложение для macOS на базе **Tauri + React + ShadCN UI**, предназначенное для управления SSH-ключами и серверными профилями. Интерфейс построен на вкладках (tabs), все экраны с листингами используют split-layout (1/4 левая колонка с возможностью ресайза от 1/4 до 2/5 ширины окна), все операции сопровождаются уведомлениями через **Sonner**.

**Версия проекта:** `1.1.8`. Правила синхронизации версий описаны в `agent.md`.

---

## Стек технологий

| Слой | Технология |
|---|---|
| Shell | Tauri 2.x (Rust backend) |
| Frontend | React 18 + TypeScript |
| UI | ShadCN UI (Radix UI primitives) |
| Стили | Tailwind CSS v3 |
| State | Zustand |
| Routing | React Router v6 (hash-router) |
| Уведомления | Sonner (ShadCN) |
| Иконки | Lucide React |
| Хранилище настроек | Tauri Store plugin |
| Сеть (P2P) | Tauri plugin + mDNS (Rust) |
| Шифрование архива | AES-256-GCM + Argon2id (Rust) |

---

## Архитектура

### Frontend (React)
```
src/
  components/
    layout/         # Shell, Tabs, ResizableSplitPane
    keys/           # KeyList, KeyDetail, KeyGenerateModal
    servers/        # ServerList, ServerDetail, ConnectModal, InstallKeyModal
    export-import/  # ExportModal, ImportModal, PeerTransferModal
    ui/             # ShadCN компоненты (переиспользуемые)
  hooks/
    useSSHKeys.ts
    useServers.ts
    usePeer.ts
  store/
    keysStore.ts
    serversStore.ts
    uiStore.ts      # selectedKey, selectedServer, tabIndex
  lib/
    tauri.ts        # обёртки над invoke()
    utils.ts
  App.tsx
  main.tsx
```

### Backend (Rust / Tauri commands)
```
src-tauri/
  src/
    commands/
      keys.rs       # scan, read, write, delete, generate
      servers.rs    # parse config, write config, delete entry
      connect.rs    # terminal spawn, ssh-copy-id, known_hosts
      archive.rs    # export/import с AES-256-GCM + Argon2id
      peer.rs       # mDNS discovery, TCP transfer, PIN auth
    main.rs
    lib.rs
```

---

## Экран 1 — SSH-ключи

### Компоновка
- Вкладка «Ключи» в главных табах
- Split-pane: левая панель (list) / правая панель (detail)
- Ширина левой панели: по умолчанию 25% окна; ресайз мышью от 25% до 40%; состояние сохраняется в Tauri Store

### 1.1 Список ключей (левая панель)
- При старте приложение сканирует `~/.ssh/` и ищет пары ключей (файл без расширения = приватный, файл с `.pub` = публичный)
- Каждый элемент списка: имя ключа, тип (ed25519 / rsa / ecdsa), иконка
- Активный ключ подсвечен; состояние «последний открытый» сохраняется в Tauri Store и восстанавливается при следующем запуске
- Кнопка **«+»** в нижней части панели открывает модальное окно генерации ключа

### 1.2 Детальная карточка ключа (правая панель)
Поля (ShadCN `Textarea` / `Input`):
- **Имя файла** — только чтение (путь)
- **Тип ключа** — только чтение
- **Приватный ключ** — редактируемый `Textarea` (скрытый по умолчанию, кнопка «показать»)
- **Публичный ключ** — редактируемый `Textarea` + кнопка «Копировать»
- **Комментарий** — редактируемый `Input` (из `.pub`)

Кнопки снизу справа:
- **Сохранить** — записывает изменения, Sonner success
- **Удалить** — ShadCN `AlertDialog` с подтверждением; физически удаляет оба файла; Sonner success/error

### 1.3 Модальное окно генерации ключа
ShadCN `Dialog`, поля:
- **Имя файла** (`Input`) — будет сохранён в `~/.ssh/<name>`
- **Тип ключа** (`Select`) — ed25519 (по умолчанию), rsa, ecdsa, dsa
- **Длина ключа** (`Select`) — зависит от типа (для rsa: 2048/3072/4096)
- **Комментарий** (`Input`) — опционально
- **Пассфраза** (`Input type=password`) — опционально

Кнопка **«Сгенерировать»**: вызывает Tauri command `ssh_keygen`, список обновляется, новый ключ открывается автоматически. Sonner success.

---

## Экран 2 — Серверы

### Компоновка
Аналогична экрану 1: split-pane с теми же правилами ресайза.

### 2.1 Список серверов (левая панель)
- Парсинг `~/.ssh/config` при старте (и после каждого изменения)
- Каждый элемент: Host-alias, HostName (IP/URL), иконка статуса
- Активный сервер — последний открытый (Tauri Store)
- Кнопка **«+»** внизу — создание нового сервера (пустая форма справа)

### 2.2 Детальная карточка сервера (правая панель)
Поля ShadCN:
- **Host** (`Input`) — псевдоним/имя хоста
- **HostName** (`Input`) — IP или домен
- **User** (`Input`) — по умолчанию `root`
- **Port** (`Input`) — по умолчанию `22`
- **IdentityFile** (`Combobox` с поиском) — выбор из существующих ключей `~/.ssh/`; кнопка «+» рядом открывает модальное окно генерации ключа с автоматической привязкой

Кнопки **снизу слева**:
- **Подключиться** — формирует строку `ssh -i <key> <user>@<hostname> -p <port>` и открывает текущий терминал пользователя (`open -a Terminal` или iTerm2 если установлен) с этой командой
- **Установить ключ на сервер** — открывает `Dialog` для ввода пароля, выполняет `ssh-copy-id`; если fingerprint отличается (host key mismatch в `known_hosts`), предлагает `AlertDialog` с возможностью удалить старую запись из `~/.ssh/known_hosts` и повторить

Кнопки **снизу справа**:
- **Сохранить** — обновляет блок в `~/.ssh/config`; Sonner success
- **Удалить** — `AlertDialog` подтверждение; удаляет блок `Host` из `~/.ssh/config`; Sonner success

### 2.3 Обработка fingerprint-конфликта
- При попытке `ssh-copy-id` или подключения Rust-backend перехватывает ошибку `REMOTE HOST IDENTIFICATION HAS CHANGED`
- Frontend показывает `AlertDialog` с объяснением и двумя действиями:
  - **Удалить старый fingerprint** — удаляет строку из `~/.ssh/known_hosts`, повторяет операцию
  - **Отмена**

---

## Экран 3 — Экспорт / Импорт

### 3.1 Экспорт
ShadCN `Dialog` с шагами:

**Шаг 1 — Выбор данных:**
- `Checkbox` — все ключи / выбранные ключи (список с чекбоксами)
- `Checkbox` — все сервера / выбранные сервера

**Шаг 2 — Защита:**
- `Input type=password` — пароль архива (опционально; если пустой — архив без пароля)
- `Input type=password` — повтор пароля

**Шаг 3 — Сохранение:**
- Нативный диалог Tauri `save_dialog` с расширением `.sshpack`
- Формирует архив (tar + AES-256-GCM с ключом, выведенным через Argon2id), сохраняет

Sonner success с именем файла.

### 3.2 Шифрование архива
- Алгоритм: **AES-256-GCM** (AEAD)
- KDF: **Argon2id** с параметрами `m=65536, t=3, p=4` (устойчив к брутфорсу)
- Соль: 32 байта случайных данных, хранится в заголовке файла
- Nonce: 12 байт, хранится в заголовке файла
- Расширение файла: `.sshpack`
- Формат заголовка: magic bytes `SSHPACK01` + соль + nonce + зашифрованные данные

### 3.3 Импорт
- Кнопка «Импортировать» — нативный диалог выбора файла `.sshpack`
- Если файл зашифрован — `Dialog` для ввода пароля
- Показывается список содержимого архива с возможностью выбрать, что импортировать
- Конфликты (уже существующие ключи/серверы): предлагается перезаписать или пропустить (`AlertDialog`)

### 3.4 P2P-передача по локальной сети

**Обнаружение:**
- Rust backend регистрирует mDNS-сервис `_sshmanager._tcp` при запуске
- Frontend показывает список найденных компьютеров в сети (имя хоста, IP)

**Соединение:**
- Инициатор выбирает компьютер → генерируется 6-значный PIN
- На принимающей стороне появляется `AlertDialog` с PIN-кодом и кнопками «Принять» / «Отклонить»
- Инициатор вводит PIN, который отобразился на другом устройстве — соединение устанавливается

**Передача:**
- После установки соединения инициатор выбирает ключи и/или серверы для передачи
- Данные передаются через шифрованный TCP-канал (TLS или Noise Protocol)
- На принимающей стороне появляется `AlertDialog` с подтверждением получения; конфликты обрабатываются аналогично импорту

---

## UI/UX детали

### Глобальный layout
```
┌─────────────────────────────────────────┐
│  [Ключи] [Серверы] [Экспорт/Импорт]    │  ← ShadCN Tabs
├─────────────────────────────────────────┤
│  ┌──────────┬──────────────────────┐   │
│  │  LIST    │  DETAIL              │   │  ← ResizablePanelGroup
│  │  (1/4)   │  (3/4)               │   │
│  │          │                      │   │
│  │  [item]  │  [form fields]       │   │
│  │  [item]  │                      │   │
│  │  [item]  │                      │   │
│  │          │       [Save] [Del]   │   │
│  │  [+]     │                      │   │
│  └──────────┴──────────────────────┘   │
└─────────────────────────────────────────┘
```

### Компоненты ShadCN к использованию
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`
- `ScrollArea` — для списков
- `Card`, `CardHeader`, `CardContent`, `CardFooter` — карточки деталей
- `Input`, `Textarea`, `Label` — поля формы
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Command` + `Popover` — Combobox для выбора ключа
- `Dialog`, `DialogTrigger`, `DialogContent` — модальные окна
- `AlertDialog` — подтверждения удаления и опасных операций
- `Button` — все кнопки
- `Badge` — тип ключа, статус
- `Separator` — разделители
- `Tooltip` — подсказки к кнопкам
- `Checkbox` — выбор элементов для экспорта
- `Sonner` (toast) — все уведомления об успехе/ошибке

### Sonner уведомления
- Успех: зелёный toast с описанием операции
- Ошибка: красный toast с текстом ошибки
- Прогресс: toast с spinner для долгих операций (генерация ключа, ssh-copy-id, P2P-передача)

---

## Безопасность

- Приватные ключи отображаются скрытыми по умолчанию (`type=password` аналог)
- Кнопка «показать» с иконкой глаза, скрывается автоматически при переключении ключа
- Файлы создаются с правами `600` (приватный) и `644` (публичный)
- `~/.ssh/config` обновляется атомарно (запись во временный файл, затем rename)
- Пароли для архива и P2P-PIN не сохраняются в памяти дольше необходимого

---

## Настройки приложения (Tauri Store)

```json
{
  "selectedKeyIndex": "id_ed25519",
  "selectedServerIndex": "my-server",
  "splitPaneWidth": 25,
  "tabIndex": 0,
  "terminalApp": "auto"
}
```

`terminalApp` — `"auto"` (определяется автоматически: iTerm2 если есть, иначе Terminal.app), или явный путь.

---

## Tauri команды (Rust → Frontend)

| Команда | Описание |
|---|---|
| `scan_ssh_keys` | Сканирует `~/.ssh`, возвращает список пар ключей |
| `read_key_content` | Читает содержимое приватного и публичного ключа |
| `save_key` | Записывает изменённые ключи на диск |
| `delete_key` | Удаляет пару ключей |
| `generate_key` | Запускает `ssh-keygen` с параметрами |
| `parse_ssh_config` | Парсит `~/.ssh/config`, возвращает список серверов |
| `save_server` | Обновляет/добавляет блок `Host` в `~/.ssh/config` |
| `delete_server` | Удаляет блок `Host` из `~/.ssh/config` |
| `connect_to_server` | Открывает терминал с командой `ssh` |
| `install_key_to_server` | Выполняет `ssh-copy-id` с паролем |
| `remove_known_host` | Удаляет запись из `~/.ssh/known_hosts` |
| `export_archive` | Создаёт `.sshpack` архив с шифрованием |
| `import_archive` | Распаковывает и импортирует `.sshpack` |
| `start_mdns` | Запускает mDNS discovery |
| `get_peers` | Возвращает найденные устройства в сети |
| `initiate_transfer` | Инициирует P2P-передачу (генерирует PIN) |
| `accept_transfer` | Принимает входящее соединение |
| `send_data` | Отправляет выбранные данные по P2P |
