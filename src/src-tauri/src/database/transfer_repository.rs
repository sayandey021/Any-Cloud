use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sqlite::Connection;
use crate::rclone::error_handler::{RcloneError, RcloneResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalTransfer {
    pub id: String,
    pub name: String,
    pub transfer_type: String,
    pub source_remote: String,
    pub source_path: String,
    pub dest_remote: String,
    pub dest_path: String,
    pub conflict_strategy: String,
    pub state: String,
    pub total_bytes: i64,
    pub bytes_transferred: i64,
    pub error_message: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
}

pub struct TransferRepository {
    conn: Arc<Mutex<Connection>>,
}

impl TransferRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub fn get_recent_transfers(&self, limit: usize) -> RcloneResult<Vec<HistoricalTransfer>> {
        let conn = self.conn.lock().unwrap();
        let query = r#"
        SELECT id, name, transfer_type, source_remote, source_path, dest_remote, dest_path,
               conflict_strategy, state, total_bytes, bytes_transferred, error_message, started_at, completed_at
        FROM transfers
        ORDER BY started_at DESC
        LIMIT :limit;
        "#;

        let mut statement = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        statement.bind((":limit", limit as i64)).unwrap();

        let mut list = Vec::new();
        while let Ok(sqlite::State::Row) = statement.next() {
            list.push(HistoricalTransfer {
                id: statement.read::<String, _>("id").unwrap_or_default(),
                name: statement.read::<String, _>("name").unwrap_or_default(),
                transfer_type: statement.read::<String, _>("transfer_type").unwrap_or_default(),
                source_remote: statement.read::<String, _>("source_remote").unwrap_or_default(),
                source_path: statement.read::<String, _>("source_path").unwrap_or_default(),
                dest_remote: statement.read::<String, _>("dest_remote").unwrap_or_default(),
                dest_path: statement.read::<String, _>("dest_path").unwrap_or_default(),
                conflict_strategy: statement.read::<String, _>("conflict_strategy").unwrap_or_default(),
                state: statement.read::<String, _>("state").unwrap_or_default(),
                total_bytes: statement.read::<i64, _>("total_bytes").unwrap_or(0),
                bytes_transferred: statement.read::<i64, _>("bytes_transferred").unwrap_or(0),
                error_message: statement.read::<Option<String>, _>("error_message").ok().flatten(),
                started_at: statement.read::<String, _>("started_at").unwrap_or_default(),
                completed_at: statement.read::<Option<String>, _>("completed_at").ok().flatten(),
            });
        }

        Ok(list)
    }

    pub fn save_transfer(&self, item: &HistoricalTransfer) -> RcloneResult<()> {
        let conn = self.conn.lock().unwrap();
        let query = r#"
        INSERT INTO transfers (
            id, name, transfer_type, source_remote, source_path, dest_remote, dest_path,
            conflict_strategy, state, total_bytes, bytes_transferred, error_message, started_at, completed_at
        ) VALUES (
            :id, :name, :transfer_type, :source_remote, :source_path, :dest_remote, :dest_path,
            :conflict_strategy, :state, :total_bytes, :bytes_transferred, :error_message, :started_at, :completed_at
        ) ON CONFLICT(id) DO UPDATE SET
            state = excluded.state,
            bytes_transferred = excluded.bytes_transferred,
            error_message = excluded.error_message,
            completed_at = excluded.completed_at;
        "#;

        let mut stmt = conn.prepare(query).map_err(|e| RcloneError::Internal(e.to_string()))?;
        stmt.bind((":id", item.id.as_str())).unwrap();
        stmt.bind((":name", item.name.as_str())).unwrap();
        stmt.bind((":transfer_type", item.transfer_type.as_str())).unwrap();
        stmt.bind((":source_remote", item.source_remote.as_str())).unwrap();
        stmt.bind((":source_path", item.source_path.as_str())).unwrap();
        stmt.bind((":dest_remote", item.dest_remote.as_str())).unwrap();
        stmt.bind((":dest_path", item.dest_path.as_str())).unwrap();
        stmt.bind((":conflict_strategy", item.conflict_strategy.as_str())).unwrap();
        stmt.bind((":state", item.state.as_str())).unwrap();
        stmt.bind((":total_bytes", item.total_bytes)).unwrap();
        stmt.bind((":bytes_transferred", item.bytes_transferred)).unwrap();
        if let Some(ref err) = item.error_message {
            stmt.bind((":error_message", err.as_str())).unwrap();
        } else {
            stmt.bind((":error_message", ())).unwrap();
        }
        stmt.bind((":started_at", item.started_at.as_str())).unwrap();
        if let Some(ref comp) = item.completed_at {
            stmt.bind((":completed_at", comp.as_str())).unwrap();
        } else {
            stmt.bind((":completed_at", ())).unwrap();
        }

        stmt.next().map_err(|e| RcloneError::Internal(e.to_string()))?;
        Ok(())
    }
}
