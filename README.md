# Any Cloud — Modern Multi-Cloud Storage Manager

<p align="center">
  <b>A unified, lightweight, cross-platform multi-cloud desktop file manager built with Tauri 2, Rust, React, and Rclone.</b>
</p>

---

## 🌟 Overview

**Any Cloud** eliminates the friction and cognitive overhead of juggling multiple cloud storage applications (Google Drive, Microsoft OneDrive, Amazon S3, Dropbox, Box, WebDAV). It connects all cloud storage accounts into one unified, blazing-fast desktop file manager with native performance and Windows 11 Fluent Design aesthetics.

### Key Architectural Highlights

- **Desktop-First Native Architecture:** Built with Tauri 2 and Rust for minimal memory footprint (< 40MB idle) and rapid startup.
- **Rclone Integration Service:** Robust asynchronous process manager executing Rclone with safe argument vector arrays, hidden console windows (`CREATE_NO_WINDOW`), stdout/stderr streaming, JSON output parsing, and zombie-prevention (`kill_on_drop`).
- **Local SQLite Metadata Cache:** Fast background synchronization and instant full-text searching (FTS5) across all connected clouds even when disconnected.
- **Cross-Cloud Transfer Engine:** Native multi-threaded file copying and moving between different cloud providers with live progress, speed calculation, ETA, and duplicate conflict resolution (Replace, Skip, Keep Both).
- **Security-First Credential Isolation:** Never exposes cloud credentials or access tokens to the frontend; uses local loopback OAuth callback with PKCE and state validation.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Shell** | Tauri 2 Desktop Runtime, Webview2 |
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **State Management** | Zustand stores (Accounts, Files, Transfers, Themes, UI) |
| **Backend Core** | Rust 1.80+, Tokio asynchronous runtime |
| **Storage Engine** | Rclone CLI process orchestrator |
| **Local Database** | SQLite with WAL mode, FTS5 full-text search |
| **Build & Tooling** | Vite, Cargo |

---

## 📁 Project Structure

```
Any Cloud/
├── package.json               # Frontend dependencies & Tauri scripts
├── package-lock.json          # Locked frontend dependencies
├── Cargo.toml                 # Root cargo workspace
├── vite.config.ts             # Vite bundler configuration
├── tailwind.config.js         # Fluent Design color tokens & radius
├── src-tauri/                 # Rust desktop backend and Tauri configuration
│   ├── Cargo.toml             # Backend dependencies
│   ├── tauri.conf.json         # Tauri 2 app & window configuration
│   ├── capabilities/          # Tauri 2 capability & permission declarations
│   └── src/                   # Commands, database, OAuth, and Rclone modules
├── src/
│   └── frontend/              # Modern React + TypeScript interface
│       ├── components/        # Reusable UI, layout, explorer & dashboard
│       ├── stores/            # Zustand reactive state stores
│       ├── services/          # Tauri IPC client & event subscriptions
│       ├── types/             # TypeScript interfaces (Cloud, File, Transfer)
│       ├── lib/               # Utility functions
│       └── styles/            # Tailwind CSS and theme definitions
├── scripts/                   # Windows packaging and version scripts
└── docs/                      # Architectural specifications & guides
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: v18 or later
2. **Rust & Cargo**: v1.75 or later
3. **Rclone** (optional for mock preview, recommended for live cloud sync): Available in PATH or `%APPDATA%\AnyCloud\bin\rclone.exe`.

### Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Run in development mode (browser preview)
npm run dev

# 3. Run desktop Tauri application
npm run tauri dev
```

### Running Backend Tests

```bash
# Run Rust unit and integration test suite
cargo test
```

---

## 🔒 Privacy & Security

Any Cloud is built with a strict **local-first, zero-relay architecture**:
- **No Intermediary Servers:** Files and authentication tokens stream directly between your personal device and your cloud providers.
- **Local Credential Storage:** Cloud API tokens, passwords, and S3 keys are stored locally on your device in your local SQLite database and Rclone config.
- **Zero Data Mining:** We do not track, collect, monetize, or inspect your file contents or directory structures.
- **Full Privacy Policy:** Read our complete [Privacy Policy](PRIVACY.md).
