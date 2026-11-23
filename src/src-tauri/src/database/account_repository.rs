use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sqlite::Connection;
use crate::rclone::error_handler::{RcloneError, RcloneResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudAccount {
    pub id: String,
    pub provider: String,
    pub name: String,
    pub label: Option<String>,
    pub status: String,
    pub quota_total: Option<i64>,
    pub quota_used: Option<i64>,
    pub quota_free: Option<i64>,
    pub last_synced_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct AccountRepository {
    conn: Arc<Mutex<Connection>>,
}

impl AccountRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> RcloneResult<Vec<CloudAccount>> {
        let conn = self.conn.lock().unwrap();
        let query = "SELECT id, provider, name, label, status, quota_total, quota_used, quota_free, last_synced_at, created_at, updated_at FROM accounts ORDER BY created_at ASC";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;

        let mut accounts = Vec::new();
        while let Ok(sqlite::State::Row) = statement.next() {
            accounts.push(CloudAccount {
                id: statement.read::<String, _>("id").unwrap_or_default(),
                provider: statement.read::<String, _>("provider").unwrap_or_default(),
                name: statement.read::<String, _>("name").unwrap_or_default(),
                label: statement.read::<Option<String>, _>("label").ok().flatten(),
                status: statement.read::<String, _>("status").unwrap_or_else(|_| "connected".to_string()),
                quota_total: statement.read::<Option<i64>, _>("quota_total").ok().flatten(),
                quota_used: statement.read::<Option<i64>, _>("quota_used").ok().flatten(),
                quota_free: statement.read::<Option<i64>, _>("quota_free").ok().flatten(),
                last_synced_at: statement.read::<Option<String>, _>("last_synced_at").ok().flatten(),
                created_at: statement.read::<String, _>("created_at").unwrap_or_default(),
                updated_at: statement.read::<String, _>("updated_at").unwrap_or_default(),
            });
        }

        Ok(accounts)
    }

    pub fn get_by_id(&self, id: &str) -> RcloneResult<Option<CloudAccount>> {
        let conn = self.conn.lock().unwrap();
        let query = "SELECT id, provider, name, label, status, quota_total, quota_used, quota_free, last_synced_at, created_at, updated_at FROM accounts WHERE id = :id";
        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":id", id)).map_err(|e| RcloneError::Internal(e.to_string()))?;

        if let Ok(sqlite::State::Row) = statement.next() {
            Ok(Some(CloudAccount {
                id: statement.read::<String, _>("id").unwrap_or_default(),
                provider: statement.read::<String, _>("provider").unwrap_or_default(),
                name: statement.read::<String, _>("name").unwrap_or_default(),
                label: statement.read::<Option<String>, _>("label").ok().flatten(),
                status: statement.read::<String, _>("status").unwrap_or_else(|_| "connected".to_string()),
                quota_total: statement.read::<Option<i64>, _>("quota_total").ok().flatten(),
                quota_used: statement.read::<Option<i64>, _>("quota_used").ok().flatten(),
                quota_free: statement.read::<Option<i64>, _>("quota_free").ok().flatten(),
                last_synced_at: statement.read::<Option<String>, _>("last_synced_at").ok().flatten(),
                created_at: statement.read::<String, _>("created_at").unwrap_or_default(),
                updated_at: statement.read::<String, _>("updated_at").unwrap_or_default(),
            }))
        } else {
            Ok(None)
        }
    }

    pub fn upsert(&self, account: &CloudAccount) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let query = r#"
        INSERT INTO accounts (id, provider, name, label, status, quota_total, quota_used, quota_free, last_synced_at, created_at, updated_at)
        VALUES (:id, :provider, :name, :label, :status, :quota_total, :quota_used, :quota_free, :last_synced_at, :created_at, :updated_at)
        ON CONFLICT(id) DO UPDATE SET
            provider = excluded.provider,
            name = excluded.name,
            label = excluded.label,
            status = excluded.status,
            quota_total = excluded.quota_total,
            quota_used = excluded.quota_used,
            quota_free = excluded.quota_free,
            last_synced_at = excluded.last_synced_at,
            updated_at = excluded.updated_at;
        "#;

        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":id", account.id.as_str())).unwrap();
        statement.bind((":provider", account.provider.as_str())).unwrap();
        statement.bind((":name", account.name.as_str())).unwrap();
        if let Some(ref l) = account.label {
            statement.bind((":label", l.as_str())).unwrap();
        } else {
            statement.bind((":label", ())).unwrap();
        }
        statement.bind((":status", account.status.as_str())).unwrap();
        if let Some(qt) = account.quota_total {
            statement.bind((":quota_total", qt)).unwrap();
        } else {
            statement.bind((":quota_total", ())).unwrap();
        }
        if let Some(qu) = account.quota_used {
            statement.bind((":quota_used", qu)).unwrap();
        } else {
            statement.bind((":quota_used", ())).unwrap();
        }
        if let Some(qf) = account.quota_free {
            statement.bind((":quota_free", qf)).unwrap();
        } else {
            statement.bind((":quota_free", ())).unwrap();
        }
        if let Some(ref ls) = account.last_synced_at {
            statement.bind((":last_synced_at", ls.as_str())).unwrap();
        } else {
            statement.bind((":last_synced_at", ())).unwrap();
        }
        statement.bind((":created_at", account.created_at.as_str())).unwrap();
        statement.bind((":updated_at", account.updated_at.as_str())).unwrap();

        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let mut statement = conn.prepare("DELETE FROM accounts WHERE id = :id").map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":id", id)).unwrap();
        statement.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }
}
