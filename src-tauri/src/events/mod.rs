use serde::{Deserialize, Serialize};

pub const EVENT_TRANSFER_PROGRESS: &str = "transfer:progress";
pub const EVENT_TRANSFER_COMPLETED: &str = "transfer:completed";
pub const EVENT_TRANSFER_FAILED: &str = "transfer:failed";
pub const EVENT_ACCOUNT_SYNCED: &str = "account:synced";
pub const EVENT_RCLONE_STATUS: &str = "rclone:status";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferFinishedPayload {
    pub transfer_id: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountSyncedPayload {
    pub account_id: String,
    pub total_files_synced: usize,
    pub timestamp: String,
}
