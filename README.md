# Any Cloud

Any Cloud is a desktop application for browsing local and cloud storage and transferring files between connected accounts. It uses React and TypeScript for the interface, Tauri 2 and Rust for the desktop application, and [Rclone](https://rclone.org/) for cloud operations.

## Features

- Connect local folders and cloud remotes supported by the app.
- Browse files and folders from connected accounts.
- Copy or move files between accounts, with transfer progress and conflict options.
- Keep file metadata in a local cache for browsing.
- Configure the app's appearance and transfer preferences.

Available providers and operations depend on the provider and its Rclone support.

## Requirements

- Node.js 18 or later and npm
- Rust stable toolchain and Cargo
- The platform prerequisites for [Tauri 2](https://v2.tauri.app/start/prerequisites/)
- Rclone for cloud operations (optional when working with local storage only)

The app looks for Rclone alongside the application, in a nearby `bin` directory, in the app data directory, or on `PATH`. On Windows, the app data binary directory is `%APPDATA%\AnyCloud\bin`. See [Rclone's download page](https://rclone.org/downloads/) for installation instructions.

## Get started

From the repository root:

```sh
npm ci
npm run start
```

`npm run start` launches the Tauri desktop app. To run only the Vite frontend server, use `npm run dev`; native desktop features require the Tauri runtime.

## Build and test

```sh
# Type-check and build the frontend
npm run build

# Build the desktop application
npm run desktop:build

# Run Rust tests
cargo test --workspace
```

To check your local Tauri development setup:

```sh
npm run tauri -- info
```

## Project layout

```text
.
├── src/
│   └── frontend/       # React interface, state, and Tauri client
├── src-tauri/
│   ├── src/            # Rust commands and application services
│   └── tauri.conf.json # Desktop application configuration
├── scripts/            # Windows packaging and version scripts
├── docs/               # Architecture notes
├── package.json        # Frontend and Tauri commands
└── Cargo.toml          # Rust workspace
```

## Local data and privacy

The app stores account configuration and cached file metadata locally. On Windows, the default app data directory is `%APPDATA%\AnyCloud`; on other systems, see the platform data-directory handling in [`src-tauri/src/platform/mod.rs`](src-tauri/src/platform/mod.rs). If the platform data directory is unavailable, the app can fall back to `./anycloud_data`.

Do not commit local app data, browser profiles, credentials, or downloaded binaries. These are excluded by [`.gitignore`](.gitignore). For more information about data handling, see the [Privacy Policy](PRIVACY.md).
