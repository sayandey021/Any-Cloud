# Any Cloud — Architecture & Implementation Reference

## 1. Rclone Process Management Architecture

The Rclone execution engine in Any Cloud is designed for high reliability, zero terminal flickering on Windows, and asynchronous streaming.

```
+-------------------------------------------------------+
|                    Tauri Commands                     |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                    RcloneManager                      |
+-------------------------------------------------------+
        |                  |                 |
        v                  v                 v
+---------------+  +---------------+  +-----------------+
| RemoteManager |  |TransferManager|  | CommandBuilder  |
+---------------+  +---------------+  +-----------------+
                           |                 |
                           v                 v
                 +--------------------------------------+
                 |            ProcessManager            |
                 | - tokio::process::Command            |
                 | - Windows CREATE_NO_WINDOW flag      |
                 | - kill_on_drop(true) zombie protect  |
                 | - stderr / stdout streaming          |
                 +--------------------------------------+
                                   |
                                   v
                 +--------------------------------------+
                 |             OutputParser             |
                 | - JSON version, lsjson, about        |
                 | - Real-time stats line parsing       |
                 +--------------------------------------+
```

### Process Isolation & Security
- **Safe Process Arguments:** Commands are built using vectors (`&[String]`), completely bypassing shell string interpolation to prevent injection attacks.
- **Hidden Console:** On Windows, `CREATE_NO_WINDOW = 0x08000000` is applied to process creation flags so child processes run cleanly without terminal windows popping up.
- **Zombie Prevention:** Every child process has `kill_on_drop(true)` enabled. If a transfer is cancelled or the Tauri application terminates, child processes are guaranteed to terminate.

---

## 2. Local SQLite Metadata Cache & Search

To provide instant offline navigation and unified search across clouds, Any Cloud persists directory metadata into an SQLite database with WAL (Write-Ahead Logging) mode enabled:

- **`accounts`**: Stores account metadata, provider type, status, and cached quota values.
- **`files`**: Stores directory hierarchy, names, paths, sizes, MIME types, mod times, favorite status, and last accessed timestamps.
- **`files_fts`**: Full-Text Search virtual table powered by SQLite FTS5 for sub-millisecond keyword searching across millions of files.
- **`transfers`**: Audit log of historical and active transfers.

### Distinguishing Cached vs Live Data
As specified in the architecture guidelines, the UI features a dedicated status pill (`Live` vs `Cached`) on the File Explorer toolbar. The user can always press the **Refresh** button to force live re-querying and update the local database.

---

## 3. Cross-Cloud Transfer Engine

Transfers between different clouds follow an asynchronous producer-consumer pipeline:

1. User selects one or more files in the Unified File Explorer.
2. User chooses **Cross-Cloud Transfer...** or clicks the toolbar button.
3. Destination cloud, target folder, operation (`Copy` vs `Move`), and conflict strategy (`Replace`, `Skip`, `Keep Both`, `Ask`) are specified.
4. Backend `TransferManager` creates a `TransferTask`, saves a record in SQLite, and spawns a background Tokio task.
5. Rclone runs with `--stats 500ms --use-json-log`.
6. `ProgressMonitor` parses streaming stderr JSON lines and emits `transfer:progress` events to the Tauri frontend.
7. Frontend `transferStore` updates speeds, progress bars, and ETA in real time.
8. Upon finish, `transfer:completed` is emitted, updating status in both UI and SQLite.
