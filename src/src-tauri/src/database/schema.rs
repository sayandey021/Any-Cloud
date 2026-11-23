pub const CREATE_ACCOUNTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'connected',
    quota_total INTEGER,
    quota_used INTEGER,
    quota_free INTEGER,
    last_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"#;

pub const CREATE_FILES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    remote_path TEXT NOT NULL,
    parent_path TEXT NOT NULL,
    name TEXT NOT NULL,
    is_dir INTEGER NOT NULL DEFAULT 0,
    size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT,
    mod_time TEXT,
    hash TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_trash INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TEXT,
    cached_at TEXT NOT NULL,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    UNIQUE(account_id, remote_path)
);

CREATE INDEX IF NOT EXISTS idx_files_parent ON files(account_id, parent_path);
CREATE INDEX IF NOT EXISTS idx_files_favorite ON files(is_favorite);
CREATE INDEX IF NOT EXISTS idx_files_recent ON files(last_accessed_at);
"#;

pub const CREATE_FILES_FTS_TABLE: &str = r#"
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
    file_id UNINDEXED,
    account_id UNINDEXED,
    name,
    remote_path,
    mime_type
);
"#;

pub const CREATE_TRANSFERS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    transfer_type TEXT NOT NULL,
    source_remote TEXT NOT NULL,
    source_path TEXT NOT NULL,
    dest_remote TEXT NOT NULL,
    dest_path TEXT NOT NULL,
    conflict_strategy TEXT NOT NULL,
    state TEXT NOT NULL,
    total_bytes INTEGER NOT NULL DEFAULT 0,
    bytes_transferred INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transfers_started ON transfers(started_at);
"#;

pub const CREATE_SETTINGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;
