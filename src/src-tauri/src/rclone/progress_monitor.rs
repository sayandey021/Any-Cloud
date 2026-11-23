use serde::{Deserialize, Serialize};
use crate::rclone::output_parser::{parse_stats_json_line, RcloneTransferStats};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressUpdate {
    pub transfer_id: String,
    pub bytes_transferred: i64,
    pub total_bytes: i64,
    pub speed_bytes_per_sec: f64,
    pub percentage: f64,
    pub eta_seconds: Option<i64>,
    pub current_file: Option<String>,
    pub error_count: i64,
}

pub struct ProgressMonitor {
    transfer_id: String,
    last_stats: Option<RcloneTransferStats>,
}

impl ProgressMonitor {
    pub fn new(transfer_id: String) -> Self {
        Self {
            transfer_id,
            last_stats: None,
        }
    }

    /// Processes a log line and if it contains stats, produces a clean ProgressUpdate.
    pub fn process_line(&mut self, line: &str) -> Option<ProgressUpdate> {
        if let Some(stats) = parse_stats_json_line(line) {
            let percentage = if stats.total_bytes > 0 {
                (stats.bytes as f64 / stats.total_bytes as f64 * 100.0).clamp(0.0, 100.0)
            } else {
                0.0
            };

            let current_file = stats
                .active_transfers
                .first()
                .map(|t| t.name.clone());

            let update = ProgressUpdate {
                transfer_id: self.transfer_id.clone(),
                bytes_transferred: stats.bytes,
                total_bytes: stats.total_bytes,
                speed_bytes_per_sec: stats.speed,
                percentage,
                eta_seconds: stats.eta,
                current_file,
                error_count: stats.errors,
            };

            self.last_stats = Some(stats);
            Some(update)
        } else {
            None
        }
    }
}
