# Agent Instructions — SSH Keys Manager

## Роль агента

Ты — разработчик macOS-приложения на **Tauri 2 + React 18 + TypeScript + ShadCN UI + Tailwind CSS v3**.
Твоя задача — реализовать приложение SSH Keys Manager строго по `project.md`, этап за этапом.
Перед началом каждого этапа прочитай соответствующий раздел `project.md` целиком.

## Общие правила

- Всегда используй **абсолютные пути**.
- Используй ShadCN-компоненты по максимуму — не пиши собственный UI там, где есть готовый компонент.
- Все уведомления об успехе/ошибке — только через **Sonner** (`toast.success`, `toast.error`, `toast.loading`).
- State-менеджмент — **Zustand** (отдельный store для ключей, серверов, UI).
- Tauri-команды — всегда через обёртки в `src/lib/tauri.ts`, не вызывай `invoke` напрямую из компонентов.
- Все операции с файловой системой, процессами и сетью — **только в Rust** (Tauri commands). Фронтенд только отображает данные и вызывает команды.
- Приватные ключи показываются только по явному действию пользователя, по умолчанию скрыты.
- Файлы ключей создаются с правами `600`, `~/.ssh/config` обновляется атомарно.
- После каждого этапа убедись, что приложение компилируется без ошибок (`cargo check` + `tsc --noEmit`).
- **Синхронизация версий**: При обновлении версии программы (`tauri.conf.json`) обязательно обновляй её в `package.json`, `package-lock.json` и `CHANGELOG.md`. Версия в интерфейсе (Settings) должна быть строго динамической (через `getAppVersion()`).

---

## Этап 0 — Scaffolding проекта

**Цель:** рабочий скелет приложения, который запускается без ошибок.

### Шаги:
1. Создай Tauri-проект командой:
   ```bash
   npm create tauri-app@latest ssh-keys-manager -- --template react-ts
   ```
2. Установи зависимости фронтенда:
   ```bash
   npm install zustand react-router-dom lucide-react sonner
   npx shadcn@latest init
   ```
3. Добавь нужные ShadCN-компоненты:
   ```bash
   npx shadcn@latest add tabs resizable scroll-area card input textarea label select dialog alert-dialog button badge separator tooltip checkbox command popover sonner
   ```
4. Добавь в `src-tauri/Cargo.toml` зависимости:
   - `tauri-plugin-store`
   - `serde`, `serde_json`
   - `tokio` (async)
   - `aes-gcm`, `argon2`, `rand` (для шифрования архива, этап 5)
   - `mdns-sd` или `zeroconf` (для P2P, этап 6)
5. Настрой `tauri.conf.json`: имя приложения `SSH Keys Manager`, идентификатор `com.sshmanager.app`, разрешения на доступ к файловой системе (`~/.ssh`), запуск процессов, сеть.
6. Создай базовую структуру директорий (см. `project.md` раздел «Архитектура»).
7. Настрой `App.tsx` с `<Tabs>` на три вкладки (пустые): Ключи, Серверы, Экспорт/Импорт.
8. Подключи `<Toaster />` из Sonner в корне приложения.
9. Инициализируй Tauri Store plugin.

**Проверка:** `npm run tauri dev` запускает окно с тремя пустыми вкладками.

---

## Этап 1 — SSH-ключи: сканирование и отображение

**Цель:** вкладка «Ключи» показывает реальные ключи из `~/.ssh/`.

### Rust (src-tauri/src/commands/keys.rs):
1. Реализуй команду `scan_ssh_keys`:
   - Читает директорию `~/.ssh/`
   - Группирует файлы в пары (файл без `.pub` + файл с `.pub`)
   - Возвращает `Vec<SshKey>` с полями: `name`, `path_private`, `path_public`, `key_type` (определяется из первой строки `.pub`)
2. Реализуй команду `read_key_content(name: String)`:
   - Возвращает содержимое приватного и публичного файла
   - Публичный ключ парсится на составляющие: тип, данные, комментарий

### Frontend:
1. Создай `keysStore.ts` (Zustand):
   - `keys: SshKey[]`
   - `selectedKey: string | null`
   - `keyContent: { private: string, public: string } | null`
   - Действия: `loadKeys`, `selectKey`, `loadKeyContent`
2. Создай компонент `KeyList`:
   - `<ScrollArea>` с элементами списка
   - Каждый элемент: имя ключа + `<Badge>` с типом (ed25519/rsa/ecdsa)
   - Активный элемент — выделен (ShadCN `cn()` + Tailwind)
   - Кнопка «+» внизу (пока без функции — будет в этапе 2)
3. Создай компонент `KeyDetail`:
   - `<Card>` с полями: имя файла (read-only), тип (read-only `<Badge>`)
   - Публичный ключ: `<Textarea>` + кнопка копировать (`<Tooltip>`)
   - Приватный ключ: `<Textarea>` скрытый по умолчанию + кнопка показать/скрыть
   - Комментарий: `<Input>` редактируемый
   - Кнопки снизу справа: «Сохранить» (disabled пока), «Удалить» (disabled пока)
4. Собери split-layout в `KeysTab`:
   - `<ResizablePanelGroup direction="horizontal">`
   - Левая панель: `defaultSize={25}`, `minSize={25}`, `maxSize={40}`
   - `<ResizableHandle withHandle />`
   - Правая панель: остаток
5. Загружай последний выбранный ключ из Tauri Store при монтировании, сохраняй при изменении.

**Проверка:** ключи из `~/.ssh/` отображаются в списке, клик открывает содержимое справа.

---

## Этап 2 — SSH-ключи: редактирование, сохранение, удаление

**Цель:** полный CRUD для ключей.

### Rust:
1. `save_key(name, private_content, public_content)`:
   - Записывает файлы атомарно (temp file → rename)
   - Устанавливает права: `600` для приватного, `644` для публичного
2. `delete_key(name)`:
   - Удаляет оба файла
3. `generate_key(name, key_type, bits, comment, passphrase)`:
   - Запускает `ssh-keygen` как подпроцесс с нужными аргументами
   - Возвращает Ok или ошибку

### Frontend:
1. Активируй кнопку «Сохранить» в `KeyDetail`:
   - Вызывает `save_key`, показывает `toast.success("Ключ сохранён")`
   - При ошибке: `toast.error(err)`
2. Активируй кнопку «Удалить»:
   - Открывает `<AlertDialog>` с текстом подтверждения
   - После подтверждения: `delete_key`, `toast.success`, обновляет список, открывает первый ключ
3. Создай `KeyGenerateModal` (`<Dialog>`):
   - Поля: имя файла, тип ключа (`<Select>`), длина ключа (`<Select>`, зависит от типа), комментарий, пассфраза
   - Кнопка «Сгенерировать»: `toast.loading` → `generate_key` → закрыть диалог → обновить список → `toast.success`
4. Подключи кнопку «+» в `KeyList` к `KeyGenerateModal`.

**Проверка:** можно создать, сохранить и удалить ключ. Все действия сопровождаются уведомлениями.

---

## Этап 3 — Серверы: отображение и редактирование

**Цель:** вкладка «Серверы» с полным управлением `~/.ssh/config`.

### Rust (src-tauri/src/commands/servers.rs):
1. `parse_ssh_config()`:
   - Парсит `~/.ssh/config` блоками `Host ...`
   - Возвращает `Vec<ServerConfig>` с полями: `host`, `hostname`, `user`, `port`, `identity_file`
2. `save_server(old_host, config: ServerConfig)`:
   - Если `old_host` пустой — добавляет новый блок
   - Иначе — заменяет существующий блок
   - Атомарная запись
3. `delete_server(host)`:
   - Удаляет блок `Host <host>` из конфига
   - Атомарная запись

### Frontend:
1. Создай `serversStore.ts` (Zustand) — аналогично `keysStore.ts`
2. Создай `ServerList` — аналогично `KeyList`:
   - Элемент: имя хоста + HostName (мелко, серым)
   - Кнопка «+» внизу
3. Создай `ServerDetail`:
   - Поля: Host, HostName, User (default: root), Port (default: 22)
   - **IdentityFile** — `<Combobox>` (ShadCN Command + Popover):
     - Поиск по именам ключей из `~/.ssh/`
     - Кнопка «+» открывает `KeyGenerateModal` с автоматической привязкой выбранного ключа
   - Кнопки снизу слева: «Подключиться», «Установить ключ на сервер»
   - Кнопки снизу справа: «Сохранить», «Удалить»
4. Подключи «Сохранить» и «Удалить» к соответствующим Rust-командам.
5. Сохраняй последний выбранный сервер в Tauri Store.

**Проверка:** серверы из `~/.ssh/config` отображаются, можно добавить/изменить/удалить.

---

## Этап 4 — Серверы: подключение и установка ключа

**Цель:** кнопки «Подключиться» и «Установить ключ» работают.

### Rust (src-tauri/src/commands/connect.rs):
1. `connect_to_server(user, hostname, port, identity_file)`:
   - Определяет доступный терминал: проверяет iTerm2 (`/Applications/iTerm.app`), иначе Terminal.app
   - Формирует строку `ssh -i <key> <user>@<hostname> -p <port>`
   - Открывает терминал с этой командой через AppleScript или `open`
2. `install_key_to_server(user, hostname, port, identity_file, password)`:
   - Запускает `ssh-copy-id` с паролем через `expect` или PTY
   - Возвращает Ok или текст ошибки
   - Если ошибка содержит `REMOTE HOST IDENTIFICATION HAS CHANGED` — возвращает специальный код ошибки `FingerprintMismatch { hostname }`
3. `remove_known_host(hostname)`:
   - Запускает `ssh-keygen -R <hostname>`

### Frontend:
1. «Подключиться» → вызывает `connect_to_server` → `toast.success("Терминал открыт")`
2. «Установить ключ»:
   - Открывает `<Dialog>` для ввода пароля
   - `toast.loading("Устанавливаю ключ...")` → `install_key_to_server`
   - Success: `toast.success`
   - Ошибка `FingerprintMismatch`: показывает `<AlertDialog>` с объяснением и кнопками «Удалить старый fingerprint» / «Отмена»
   - «Удалить старый fingerprint» → `remove_known_host` → повторяет `install_key_to_server`

**Проверка:** подключение открывает терминал, установка ключа работает, fingerprint-конфликт обрабатывается корректно.

---

## Этап 5 — Экспорт и Импорт

**Цель:** работает сохранение и загрузка `.sshpack` архивов.

### Rust (src-tauri/src/commands/archive.rs):
1. Структура `.sshpack` файла:
   ```
   [9 bytes]  magic: "SSHPACK01"
   [1 byte]   flags: бит 0 = зашифрован
   [32 bytes] соль Argon2id (если зашифрован)
   [12 bytes] nonce AES-GCM (если зашифрован)
   [остаток]  tar.gz данные (зашифрованные или нет)
   ```
2. `export_archive(keys: Vec<String>, servers: Vec<String>, password: Option<String>, dest_path: String)`:
   - Собирает файлы ключей и блоки из `~/.ssh/config` в tar.gz в памяти
   - Если пароль задан: Argon2id (m=65536, t=3, p=4) → ключ AES-256 → AES-GCM шифрование
   - Записывает файл с заголовком
3. `import_archive(src_path: String, password: Option<String>)`:
   - Читает заголовок, определяет формат
   - Расшифровывает если нужно
   - Возвращает список содержимого (ключи и серверы)
4. `apply_import(items: Vec<ImportItem>, overwrite: bool)`:
   - Копирует ключи в `~/.ssh/`, мерджит серверы в `~/.ssh/config`

### Frontend:
1. Вкладка «Экспорт/Импорт» — две секции:

**Экспорт** (кнопка → `<Dialog>` с шагами):
- Шаг 1: `<Checkbox>` для каждого ключа, `<Checkbox>` «Все ключи»; то же для серверов
- Шаг 2: поля пароля и повтора пароля
- Шаг 3: нативный диалог сохранения → `export_archive` → `toast.success`

**Импорт** (кнопка → нативный диалог выбора файла):
- Если архив зашифрован — `<Dialog>` для пароля
- Показывает список содержимого с `<Checkbox>` для каждого элемента
- Кнопка «Импортировать выбранное» → `apply_import` → `toast.success`
- Конфликты: `<AlertDialog>` «Перезаписать?»

**Проверка:** экспорт создаёт файл, импорт восстанавливает ключи и серверы. Зашифрованный архив не открывается без пароля.

---

## Этап 6 — P2P-передача по локальной сети

**Цель:** два запущенных экземпляра приложения видят друг друга и могут передавать данные.

### Rust (src-tauri/src/commands/peer.rs):
1. При старте приложения: регистрирует mDNS-сервис `_sshmanager._tcp` на случайном порту
2. `get_peers()`: возвращает список обнаруженных устройств `Vec<Peer>` с полями `name`, `ip`, `port`
3. `initiate_transfer(peer_ip, peer_port)`:
   - Открывает TCP-соединение
   - Генерирует 6-значный PIN
   - Отправляет запрос на соединение (имя устройства, хэш PIN)
   - Возвращает PIN инициатору (показывается в UI)
4. `accept_transfer(connection_id, accept: bool)`:
   - Принимает или отклоняет входящий запрос
5. `send_data(connection_id, keys: Vec<String>, servers: Vec<String>)`:
   - Сериализует данные в формат аналогичный `.sshpack` (без заголовка с магическими байтами, с шифрованием сессионным ключом)
   - Отправляет по установленному TCP-соединению
6. Tauri events (emit из Rust → listen во Frontend):
   - `peer-request` — входящий запрос соединения
   - `peer-connected` — соединение установлено
   - `peer-data-received` — данные получены

### Frontend (в вкладке «Экспорт/Импорт», секция P2P):
1. Список найденных устройств (обновляется каждые 3 сек)
2. Клик на устройство → вызов `initiate_transfer` → показывает `<Dialog>` с PIN-кодом и статусом «Ожидание подтверждения...»
3. При событии `peer-request` на принимающей стороне: `<AlertDialog>` «Устройство X хочет подключиться. PIN: XXXXXX. Принять?»
4. После `peer-connected` у инициатора: показывает выбор ключей/серверов для передачи (аналог шага 1 экспорта)
5. При `peer-data-received`: `<AlertDialog>` с подтверждением импорта → `apply_import`

**Проверка:** два экземпляра приложения на двух Mac в одной сети находят друг друга, устанавливают соединение через PIN и передают ключи.

---

## Этап 7 — Полировка и финальные детали

### Доработки UX:
1. `<Tooltip>` на все иконочные кнопки
2. Пустые состояния: если ключей нет — заглушка с предложением создать; если серверов нет — аналогично
3. Skeleton-loading при загрузке данных (ShadCN Skeleton)
4. Keyboard shortcuts: `Cmd+S` — сохранить, `Delete`/`Backspace` — удалить (с фокусом на списке)
5. Автоматическое обновление списков при изменении файлов `~/.ssh/` (Tauri `watch` через `notify` crate)
6. Настройки (минимальные): выбор терминала (Auto / Terminal.app / iTerm2 / Warp)

### Проверки безопасности:
- Убедись, что приватные ключи не попадают в логи Tauri
- Пароли очищаются из памяти после использования (`zeroize` crate)
- Права на созданные файлы строго `600`/`644`

### Финальная проверка:
- `cargo clippy` без предупреждений
- `tsc --noEmit` без ошибок
- `npm run tauri build` создаёт `.dmg`
- Ручное тестирование всех сценариев из `project.md`

---

## Порядок работы агента

1. Читай `project.md` перед каждым этапом
2. Реализуй Rust-команды → проверь `cargo check`
3. Реализуй Frontend → проверь `tsc --noEmit`
4. Запусти `npm run tauri dev` и проверь этап вручную
5. Зафиксируй результат, переходи к следующему этапу
6. **ВАЖНО**: После всех изменений производи сборку, перезаписывай приложение в `/Applications` на этой машине и запускай его командой:
   `npm run tauri build && rm -rf "/Applications/SSH Keys Manager.app" && cp -R "src-tauri/target/release/bundle/macos/SSH Keys Manager.app" /Applications/ && open "/Applications/SSH Keys Manager.app"`
7. **Не переходи к следующему этапу, если текущий не компилируется или функции не работают**
