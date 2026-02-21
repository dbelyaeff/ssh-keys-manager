# Changelog

All notable changes to SSH Keys Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-02-21

### Added
- "Select All" checkbox in SSH Keys and Servers list headers
- Global UI state for Selected items (Sync selection across tabs for Export)
- Dynamic detection of installed macOS terminals (Terminal.app, iTerm, Warp) in Settings

### Changed
- Export dialog extracted into a standalone modal (no longer forces changing to Export tab)
- UI styling improvements for SSH Keys and Servers lists to enhance alignment
- Improved Install Key button behaviour in server connection logic

## [1.0.1] - 2026-02-21

### Added
- P2P Local Network Transfer UI in Export/Import tab
  - mDNS peer discovery with device list
  - Send dialog with key/server selection and PIN display
  - Incoming transfer cards with accept/reject and data preview badges
  - Full i18n support (RU/EN) for all P2P strings
- "About" section in Settings (tech stack badges, author, license, GitHub link)
- CHANGELOG.md

### Fixed
- App icon now has real PNG alpha transparency (chroma-keyed, no fake checker)
- Icon fills entire canvas edge-to-edge without padding
- All icon sizes regenerated (png, icns, ico)
- Bundle identifier fixed to `com.dbelyaeff.sshkeysmanager`

### Changed
- Updated README.md and README.ru.md with P2P documentation
- Security section updated to reflect local network P2P access

## [1.0.0] - 2026-02-21

### Added

#### SSH Key Management
- Scan and display all SSH keys from `~/.ssh/`
- View and edit public and private key contents
- Generate new keys (Ed25519, RSA, ECDSA) via modal dialog
- Copy key contents to clipboard (one-click)
- Delete keys with confirmation dialog

#### Server Management
- Parse and display `~/.ssh/config` hosts
- Create new servers via modal dialog with IdentityFile selector
- Edit server configuration (Host, HostName, User, Port, IdentityFile)
- Searchable key combobox with option to generate a new key inline
- Auto-detect SSH connectivity (BatchMode check):
  - Shows "Connect" button when key-based access is available
  - Shows "Install Key" button when no access
- Connect to server via system terminal (`.command` files)
- Install key via `ssh-copy-id` with password support
- Handle fingerprint mismatch with option to remove old `known_hosts` entry

#### Export / Import
- Export selected keys and servers to encrypted `.sshpack` archive
- AES-256-GCM encryption with Argon2id key derivation
- Password confirmation (type twice) during export
- Import with archive content preview before applying
- Auto-detect encrypted archives and prompt for password
- Overwrite/skip control for existing keys and servers

#### P2P Local Network Transfer
- mDNS service discovery (`_sshmanager._tcp`)
- TCP-based data transfer with length-prefixed JSON protocol
- 6-digit PIN authentication for secure device pairing
- Send selected keys and servers to another machine on the network
- Receive and apply incoming transfers with overwrite control
- Incoming transfer notifications with accept/reject actions
- Full UI section in Export/Import tab with peer discovery and send dialog

#### Settings
- Theme switching: System / Light / Dark with header bar quick-access icons
- Language selection: Russian 🇷🇺 / English 🇬🇧 with system language auto-detection
- Persistent settings saved to localStorage

#### About Section
- App logo, version display
- Technology stack badges
- Author: D.P. Belyaev
- MIT License
- GitHub repository link

#### Internationalization (i18n)
- Full Russian and English language support across entire UI
- Key-based translation system with `t(language, "key.path")` helper

#### CI/CD
- GitHub Actions workflow for macOS release builds
- Produces `.dmg` for Apple Silicon (aarch64) and Intel (x86_64)
- Auto-creates GitHub Release with download links on tag push

### Design
- Frost Glass macOS-style app icon with real PNG alpha transparency
- Two-panel resizable split layout (ResizablePanelGroup)
- Animated delete button (ghost icon → red button with text on hover)
- Toast notifications via Sonner
- Modal dialogs for all creation flows
- Full dark mode / light mode support

[1.0.3]: https://github.com/dbelyaeff/ssh-keys-manager/releases/tag/v1.0.3
[1.0.1]: https://github.com/dbelyaeff/ssh-keys-manager/releases/tag/v1.0.1
[1.0.0]: https://github.com/dbelyaeff/ssh-keys-manager/releases/tag/v1.0.0
