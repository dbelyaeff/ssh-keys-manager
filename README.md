# SSH Keys Manager

<p align="center">
  <img src="src-tauri/icons/icon.png" width="128" height="128" alt="SSH Keys Manager Logo">
</p>

<p align="center">
  <strong>A modern, native desktop application for managing SSH keys and server connections.</strong>
</p>

<p align="center">
  Built with <a href="https://tauri.app/">Tauri 2</a> · <a href="https://react.dev/">React</a> · <a href="https://www.rust-lang.org/">Rust</a>
</p>

<p align="center">
  <a href="README.ru.md">🇷🇺 Русская версия</a>
</p>

---

## ✨ Features

### 🔑 SSH Key Management
- **Scan & display** all keys from `~/.ssh/` automatically
- **View & edit** public and private key contents
- **Generate new keys** — supports Ed25519, RSA, and ECDSA with configurable bit length
- **Copy to clipboard** — one-click copy for public or private keys
- **Delete keys** with confirmation dialog

### 🖥️ Server Management
- **Parse `~/.ssh/config`** and display all configured hosts
- **Add new servers** via a modal dialog with all fields (Host, HostName, User, Port, IdentityFile)
- **Key selector** — searchable combobox dropdown to pick an existing SSH key, or generate a new one on the fly
- **Auto-detect connection** — the app automatically tests SSH connectivity in the background:
  - ✅ If the key is installed → shows **"Connect"** button (opens your default terminal)
  - 🔑 If no key-based access → shows **"Install Key"** button (runs `ssh-copy-id`)
- **Fingerprint mismatch handling** — detects `REMOTE HOST IDENTIFICATION HAS CHANGED` and offers to remove the old fingerprint
- **Terminal integration** — connects securely, intelligently launching your installed default macOS terminal app (Terminal.app, iTerm, Warp)

### 📦 Export & Import
- **Export** selected keys and server configs into a single encrypted archive via a convenient Modal Dialog without breaking your workflow
- **AES-256-GCM** encryption with **Argon2** key derivation for maximum security
- **Password confirmation** — requires typing the password twice during export
- **Import with preview** — browse the archive contents before applying
- **Password prompt** — automatically detects encrypted archives and asks for the password
- **Overwrite control** — choose to overwrite existing keys/servers or skip duplicates

### 📡 P2P Local Network Transfer
- **mDNS discovery** — automatically finds other SSH Keys Manager instances on the local network
- **TCP data transfer** with length-prefixed JSON protocol
- **6-digit PIN** authentication for secure device pairing
- **Send dialog** — select keys and servers to transfer, with PIN confirmation
- **Incoming transfers** — accept or reject with data preview (key 🔑 and server 🖥 badges)
- **Apply received data** — imported keys get correct permissions (`600`/`644`)

### ⚙️ Settings
- **Theme switching** — System / Light / Dark with quick-access icons in the header bar (Monitor / Sun / Moon)
- **Language selection** — Russian 🇷🇺 and English 🇬🇧 with automatic system language detection
- **Persistent settings** — all preferences saved to `localStorage`

### 🌍 Internationalization (i18n)
- Full support for **Russian** and **English** across the entire UI
- Key-based translation system with `t(language, "key.path")` helper

---

## 🖼️ UI Highlights

| Feature | Description |
|---------|-------------|
| **Two-panel layout** | Resizable split view with list on the left and details on the right |
| **Frost Glass icon** | Custom macOS-style glassmorphism app icon |
| **Animated delete button** | Minimal ghost icon that expands to a red button with text on hover |
| **Toast notifications** | Non-intrusive feedback via Sonner |
| **Modal dialogs** | All creation flows (keys, servers) use clean modal windows |
| **Theme-aware** | Full dark mode / light mode support |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| [React 18](https://react.dev/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [TailwindCSS](https://tailwindcss.com/) | Utility-first styling |
| [ShadCN/UI](https://ui.shadcn.com/) | Component library (Radix-based) |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [Lucide](https://lucide.dev/) | Icon library |
| [Sonner](https://sonner.emilkowal.ski/) | Toast notifications |

### Backend
| Technology | Purpose |
|-----------|---------|
| [Rust](https://www.rust-lang.org/) | Backend language |
| [Tauri 2](https://tauri.app/) | Desktop app framework |
| [AES-GCM](https://crates.io/crates/aes-gcm) | AES-256-GCM encryption |
| [Argon2](https://crates.io/crates/argon2) | Password-based key derivation |
| [tar](https://crates.io/crates/tar) + [flate2](https://crates.io/crates/flate2) | Archive creation/extraction |
| [mdns-sd](https://crates.io/crates/mdns-sd) | mDNS/DNS-SD for P2P discovery |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Rust** (via [rustup](https://rustup.rs/))
- **Tauri CLI** ≥ 2.x

```bash
# Install Tauri CLI globally (if not already installed)
cargo install tauri-cli
```

### Installation

```bash
# Clone the repository
git clone https://github.com/dbelyaeff/ssh-keys-manager.git
cd ssh-keys-manager

# Install frontend dependencies
npm install
```

### Development

```bash
# Start the development server with hot-reload
npm run tauri dev
```

### Build for Production

```bash
# Create a production build
npm run tauri build
```

The built application will be available in `src-tauri/target/release/bundle/`.

---

## 📁 Project Structure

```
ssh-keys-manager/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── keys/                 # Key management UI
│   │   │   ├── KeysTab.tsx       # Main keys tab layout
│   │   │   ├── KeyList.tsx       # Key list sidebar
│   │   │   ├── KeyDetail.tsx     # Key detail view & editor
│   │   │   └── KeyGenerateModal.tsx  # Key generation dialog
│   │   ├── servers/              # Server management UI
│   │   │   ├── ServersTab.tsx    # Main servers tab layout
│   │   │   ├── ServerList.tsx    # Server list sidebar
│   │   │   ├── ServerDetail.tsx  # Server detail view & editor
│   │   │   └── ServerCreateModal.tsx # Server creation dialog
│   │   ├── export-import/        # Export/Import UI
│   │   │   └── ExportImportTab.tsx
│   │   ├── settings/             # Settings UI
│   │   │   └── SettingsTab.tsx
│   │   └── ui/                   # ShadCN UI components
│   ├── store/                    # Zustand stores
│   │   ├── keysStore.ts
│   │   ├── serversStore.ts
│   │   ├── settingsStore.ts
│   │   └── uiStore.ts
│   ├── lib/
│   │   ├── tauri.ts              # Tauri command bindings
│   │   ├── i18n.ts               # Translations (RU/EN)
│   │   └── utils.ts              # Utility functions
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles & Tailwind
├── src-tauri/                    # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── commands/
│   │   │   ├── keys.rs           # SSH key operations
│   │   │   ├── servers.rs        # SSH config parsing & editing
│   │   │   ├── connect.rs        # Terminal launch & ssh-copy-id
│   │   │   ├── archive.rs        # Export/Import with encryption
│   │   │   └── peer.rs           # P2P mDNS discovery & TCP transfer
│   │   ├── lib.rs                # Tauri plugin & handler registration
│   │   └── main.rs               # App entry point
│   ├── icons/                    # App icons (all sizes + .icns/.ico)
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🔐 Security

- **Encryption**: Archives are encrypted with AES-256-GCM. The encryption key is derived from the user's password using Argon2id with a random 16-byte salt.
- **Memory safety**: Sensitive data (passwords, keys) is handled in Rust with the `zeroize` crate for secure memory cleanup.
- **No external network access**: The app only communicates with local SSH tools (`ssh`, `ssh-keygen`, `ssh-copy-id`) and local network peers (mDNS + TCP). No data is sent to external servers.

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes in each version.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
