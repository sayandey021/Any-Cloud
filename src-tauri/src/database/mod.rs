pub mod account_repository;
pub mod file_repository;
pub mod schema;
pub mod transfer_repository;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use crate::platform::get_app_data_dir;
use crate::rclone::error_handler::{RcloneError, RcloneResult};
pub use account_repository::{AccountRepository, CloudAccount};
pub use file_repository::{CachedFile, FileRepository};
pub use transfer_repository::{HistoricalTransfer, TransferRepository};

#[derive(Clone)]
pub struct Database {
    pub accounts: Arc<AccountRepository>,
    pub files: Arc<FileRepository>,
    pub transfers: Arc<TransferRepository>,
    pub conn: Arc<Mutex<sqlite::Connection>>,
}

impl Database {
    pub fn get_setting(&self, key: &str) -> Option<String> {
        let conn = self.conn.lock().unwrap();
        let query = "SELECT value FROM settings WHERE key = :key";
        if let Ok(mut stmt) = conn.prepare(query) {
            if stmt.bind((":key", key)).is_ok() {
                if let Ok(sqlite::State::Row) = stmt.next() {
                    return stmt.read::<String, _>("value").ok();
                }
            }
        }
        None
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let query = "INSERT INTO settings (key, value) VALUES (:key, :value) ON CONFLICT(key) DO UPDATE SET value = excluded.value";
        let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
        stmt.bind((":key", key)).map_err(|e| e.to_string())?;
        stmt.bind((":value", value)).map_err(|e| e.to_string())?;
        stmt.next().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn init(db_path: Option<PathBuf>) -> RcloneResult<Self> {
        let path = db_path.unwrap_or_else(|| {
            let dir = get_app_data_dir();
            let _ = std::fs::create_dir_all(&dir);
            dir.join("anycloud.db")
        });

        let conn = match sqlite::open(&path) {
            Ok(c) => c,
            Err(_) => {
                let fallback_dir = PathBuf::from("./anycloud_data");
                let _ = std::fs::create_dir_all(&fallback_dir);
                let fallback_path = fallback_dir.join("anycloud.db");
                sqlite::open(&fallback_path).map_err(|e| {
                    RcloneError::Internal(format!("Failed to open SQLite database: {}", e))
                })?
            }
        };

        // Enable WAL mode for high concurrency and performance
        let _ = conn.execute("PRAGMA journal_mode = WAL;");
        let _ = conn.execute("PRAGMA synchronous = NORMAL;");
        let _ = conn.execute("PRAGMA foreign_keys = ON;");

        // Run migrations
        conn.execute(schema::CREATE_ACCOUNTS_TABLE).map_err(|e| RcloneError::Internal(e.to_string()))?;
        conn.execute(schema::CREATE_FILES_TABLE).map_err(|e| RcloneError::Internal(e.to_string()))?;
        let _ = conn.execute(schema::CREATE_FILES_FTS_TABLE); // FTS5 optional if supported
        conn.execute(schema::CREATE_TRANSFERS_TABLE).map_err(|e| RcloneError::Internal(e.to_string()))?;
        conn.execute(schema::CREATE_SETTINGS_TABLE).map_err(|e| RcloneError::Internal(e.to_string()))?;

        let shared_conn = Arc::new(Mutex::new(conn));

        Ok(Self {
            accounts: Arc::new(AccountRepository::new(shared_conn.clone())),
            files: Arc::new(FileRepository::new(shared_conn.clone())),
            transfers: Arc::new(TransferRepository::new(shared_conn.clone())),
            conn: shared_conn,
        })
    }
}
