use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sqlite::Connection;
use crate::rclone::error_handler::{RcloneError, RcloneResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedFile {
    pub id: String,
    pub account_id: String,
    pub remote_path: String,
    pub parent_path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: i64,
    pub mime_type: Option<String>,
    pub mod_time: Option<String>,
    pub hash: Option<String>,
    pub is_favorite: bool,
    pub is_trash: bool,
    pub last_accessed_at: Option<String>,
    pub cached_at: String,
}

pub struct FileRepository {
    conn: Arc<Mutex<Connection>>,
}

impl FileRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    /// Reads directory contents for a specific account and parent path
    pub fn get_by_parent(&self, account_id: &str, parent_path: &str) -> RcloneResult<Vec<CachedFile>> {
        let conn = self.conn.lock().unwrap();
        let normalized_parent = if parent_path.is_empty() || parent_path == "/" {
            ""
        } else {
            parent_path.trim_matches('/')
        };

        let query = r#"
        SELECT id, account_id, remote_path, parent_path, name, is_dir, size, mime_type, mod_time, hash, is_favorite, is_trash, last_accessed_at, cached_at
        FROM files
        WHERE account_id = :account_id AND parent_path = :parent_path AND is_trash = 0
        ORDER BY is_dir DESC, name COLLATE NOCASE ASC;
        "#;

        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":account_id", account_id)).unwrap();
        statement.bind((":parent_path", normalized_parent)).unwrap();

        let mut files = Vec::new();
        while let Ok(sqlite::State::Row) = statement.next() {
            files.push(self.row_to_file(&statement));
        }

        Ok(files)
    }

    /// Full-text search across all accounts or within a specific account
    pub fn search_files(&self, query_str: &str, account_id: Option<&str>) -> RcloneResult<Vec<CachedFile>> {
        let conn = self.conn.lock().unwrap();
        let trimmed = query_str.trim();
        if trimmed.is_empty() {
            return Ok(Vec::new());
        }

        let like_query = format!("%{}%", trimmed);
        let sql = if let Some(_) = account_id {
            r#"
            SELECT id, account_id, remote_path, parent_path, name, is_dir, size, mime_type, mod_time, hash, is_favorite, is_trash, last_accessed_at, cached_at
            FROM files
            WHERE account_id = :account_id AND is_trash = 0 AND (name LIKE :q OR remote_path LIKE :q)
            ORDER BY is_dir DESC, name ASC LIMIT 100;
            "#
        } else {
            r#"
            SELECT id, account_id, remote_path, parent_path, name, is_dir, size, mime_type, mod_time, hash, is_favorite, is_trash, last_accessed_at, cached_at
            FROM files
            WHERE is_trash = 0 AND (name LIKE :q OR remote_path LIKE :q)
            ORDER BY is_dir DESC, name ASC LIMIT 100;
            "#
        };

        let mut statement = conn.prepare(sql).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":q", like_query.as_str())).unwrap();
        if let Some(acc) = account_id {
            statement.bind((":account_id", acc)).unwrap();
        }

        let mut files = Vec::new();
        while let Ok(sqlite::State::Row) = statement.next() {
            files.push(self.row_to_file(&statement));
        }

        Ok(files)
    }

    /// Returns all favorite files across clouds
    pub fn get_favorites(&self) -> RcloneResult<Vec<CachedFile>> {
        let conn = self.conn.lock().unwrap();
        let query = r#"
        SELECT id, account_id, remote_path, parent_path, name, is_dir, size, mime_type, mod_time, hash, is_favorite, is_trash, last_accessed_at, cached_at
        FROM files
        WHERE is_favorite = 1 AND is_trash = 0
        ORDER BY name COLLATE NOCASE ASC;
        "#;

        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        let mut files = Vec::new();
        while let Ok(sqlite::State::Row) = statement.next() {
            files.push(self.row_to_file(&statement));
        }
        Ok(files)
    }

    /// Toggles favorite flag on a file
    pub fn toggle_favorite(&self, file_id: &str, is_favorite: bool) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let query = "UPDATE files SET is_favorite = :fav WHERE id = :id";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":fav", if is_favorite { 1 } else { 0 })).unwrap();
        statement.bind((":id", file_id)).unwrap();
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    /// Returns recently accessed or modified files
    pub fn get_recents(&self, limit: usize) -> RcloneResult<Vec<CachedFile>> {
        let conn = self.conn.lock().unwrap();
        let query = r#"
        SELECT id, account_id, remote_path, parent_path, name, is_dir, size, mime_type, mod_time, hash, is_favorite, is_trash, last_accessed_at, cached_at
        FROM files
        WHERE is_trash = 0
        ORDER BY COALESCE(last_accessed_at, mod_time, cached_at) DESC
        LIMIT :limit;
        "#;

        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":limit", limit as i64)).unwrap();
        let mut files = Vec::new();
        while let Ok(sqlite::State::Row) = statement.next() {
            files.push(self.row_to_file(&statement));
        }
        Ok(files)
    }

    /// Returns all trashed files across clouds
    pub fn get_trash(&self) -> RcloneResult<Vec<CachedFile>> {
        let conn = self.conn.lock().unwrap();
        let query = r#"
        SELECT id, account_id, remote_path, parent_path, name, is_dir, size, mime_type, mod_time, hash, is_favorite, is_trash, last_accessed_at, cached_at
        FROM files
        WHERE is_trash = 1
        ORDER BY cached_at DESC;
        "#;

        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        let mut files = Vec::new();
        while let Ok(sqlite::State::Row) = statement.next() {
            files.push(self.row_to_file(&statement));
        }
        Ok(files)
    }

    /// Moves a file to trash or restores it
    pub fn mark_trash(&self, account_id: &str, remote_path: &str, is_trash: bool) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let prefix = format!("{}%", remote_path.trim_end_matches('/'));
        let query = "UPDATE files SET is_trash = :trash WHERE account_id = :account_id AND (remote_path = :path OR remote_path LIKE :prefix)";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":trash", if is_trash { 1 } else { 0 })).unwrap();
        statement.bind((":account_id", account_id)).unwrap();
        statement.bind((":path", remote_path)).unwrap();
        statement.bind((":prefix", prefix.as_str())).unwrap();
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    /// Empties all trashed files
    pub fn empty_trash(&self) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let query = "DELETE FROM files WHERE is_trash = 1";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    /// Records access time
    pub fn update_access_time(&self, file_id: &str) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        let query = "UPDATE files SET last_accessed_at = :now WHERE id = :id";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":now", now.as_str())).unwrap();
        statement.bind((":id", file_id)).unwrap();
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    /// Upserts a batch of cached files into local DB
    pub fn batch_upsert(&self, files: &[CachedFile]) -> RcloneResult<()> {
        if files.is_empty() {
            return Ok(());
        }

        let conn = self.conn.lock().unwrap();
        conn.execute("BEGIN TRANSACTION;").map_err(|e| RcloneError::Internal(e.to_string()))?;

        let query = r#"
        INSERT INTO files (id, account_id, remote_path, parent_path, name, is_dir, size, mime_type, mod_time, hash, is_favorite, is_trash, last_accessed_at, cached_at)
        VALUES (:id, :account_id, :remote_path, :parent_path, :name, :is_dir, :size, :mime_type, :mod_time, :hash, :is_favorite, :is_trash, :last_accessed_at, :cached_at)
        ON CONFLICT(account_id, remote_path) DO UPDATE SET
            name = excluded.name,
            parent_path = excluded.parent_path,
            is_dir = excluded.is_dir,
            size = excluded.size,
            mime_type = excluded.mime_type,
            mod_time = excluded.mod_time,
            hash = excluded.hash,
            cached_at = excluded.cached_at;
        "#;

        for f in files {
            let mut statement = match conn.prepare(query) {
                Ok(s) => s,
                Err(e) => {
                    let _ = conn.execute("ROLLBACK;");
                    return Err(RcloneError::Internal(e.to_string()));
                }
            };
            let _ = statement.bind((":id", f.id.as_str()));
            let _ = statement.bind((":account_id", f.account_id.as_str()));
            let _ = statement.bind((":remote_path", f.remote_path.as_str()));
            let _ = statement.bind((":parent_path", f.parent_path.as_str()));
            let _ = statement.bind((":name", f.name.as_str()));
            let _ = statement.bind((":is_dir", if f.is_dir { 1 } else { 0 }));
            let _ = statement.bind((":size", f.size));
            if let Some(ref m) = f.mime_type {
                let _ = statement.bind((":mime_type", m.as_str()));
            } else {
                let _ = statement.bind((":mime_type", ()));
            }
            if let Some(ref mt) = f.mod_time {
                let _ = statement.bind((":mod_time", mt.as_str()));
            } else {
                let _ = statement.bind((":mod_time", ()));
            }
            if let Some(ref h) = f.hash {
                let _ = statement.bind((":hash", h.as_str()));
            } else {
                let _ = statement.bind((":hash", ()));
            }
            let _ = statement.bind((":is_favorite", if f.is_favorite { 1 } else { 0 }));
            let _ = statement.bind((":is_trash", if f.is_trash { 1 } else { 0 }));
            if let Some(ref la) = f.last_accessed_at {
                let _ = statement.bind((":last_accessed_at", la.as_str()));
            } else {
                let _ = statement.bind((":last_accessed_at", ()));
            }
            let _ = statement.bind((":cached_at", f.cached_at.as_str()));

            if let Err(e) = statement.next() {
                let _ = conn.execute("ROLLBACK;");
                return Err(RcloneError::Internal(e.to_string()));
            }
        }

        conn.execute("COMMIT;").map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    /// Deletes a file or directory from local cache by path
    pub fn delete_by_path(&self, account_id: &str, remote_path: &str) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let query = "DELETE FROM files WHERE account_id = :acc AND (remote_path = :path OR parent_path LIKE :like_path)";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":acc", account_id)).unwrap();
        statement.bind((":path", remote_path)).unwrap();
        let like = format!("{}%", remote_path);
        statement.bind((":like_path", like.as_str())).unwrap();
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    /// Deletes all cached files for an account
    pub fn delete_account_files(&self, account_id: &str) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let query = "DELETE FROM files WHERE account_id = :acc";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":acc", account_id)).unwrap();
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    /// Deletes all cached files across all accounts
    pub fn clear_all_cache(&self) -> RcloneResult<usize> {
        let conn = self.conn.lock().unwrap();
        let mut count = 0;
        let count_query = "SELECT COUNT(*) FROM files";
        if let Ok(mut stmt) = conn.prepare(count_query) {
            if let Ok(sqlite::State::Row) = stmt.next() {
                count = stmt.read::<i64, _>(0).unwrap_or(0) as usize;
            }
        }

        let query = "DELETE FROM files";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(count)
    }

    /// Gets total count and approximate size of cached files
    pub fn get_cache_stats(&self) -> RcloneResult<(usize, i64)> {
        let conn = self.conn.lock().unwrap();
        let mut count = 0;
        let mut total_size: i64 = 0;
        let query = "SELECT COUNT(*), COALESCE(SUM(size), 0) FROM files";
        if let Ok(mut stmt) = conn.prepare(query) {
            if let Ok(sqlite::State::Row) = stmt.next() {
                count = stmt.read::<i64, _>(0).unwrap_or(0) as usize;
                total_size = stmt.read::<i64, _>(1).unwrap_or(0);
            }
        }
        Ok((count, total_size))
    }

    fn row_to_file(&self, stmt: &sqlite::Statement) -> CachedFile {
        CachedFile {
            id: stmt.read::<String, _>("id").unwrap_or_default(),
            account_id: stmt.read::<String, _>("account_id").unwrap_or_default(),
            remote_path: stmt.read::<String, _>("remote_path").unwrap_or_default(),
            parent_path: stmt.read::<String, _>("parent_path").unwrap_or_default(),
            name: stmt.read::<String, _>("name").unwrap_or_default(),
            is_dir: stmt.read::<i64, _>("is_dir").unwrap_or(0) == 1,
            size: stmt.read::<i64, _>("size").unwrap_or(0),
            mime_type: stmt.read::<Option<String>, _>("mime_type").ok().flatten(),
            mod_time: stmt.read::<Option<String>, _>("mod_time").ok().flatten(),
            hash: stmt.read::<Option<String>, _>("hash").ok().flatten(),
            is_favorite: stmt.read::<i64, _>("is_favorite").unwrap_or(0) == 1,
            is_trash: stmt.read::<i64, _>("is_trash").unwrap_or(0) == 1,
            last_accessed_at: stmt.read::<Option<String>, _>("last_accessed_at").ok().flatten(),
            cached_at: stmt.read::<String, _>("cached_at").unwrap_or_default(),
        }
    }
}
