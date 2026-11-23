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
}

impl Database {
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
            transfers: Arc::new(TransferRepository::new(shared_conn)),
        })
    }
}
