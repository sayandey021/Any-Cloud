use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex};
use crate::rclone::command_builder::RcloneCommandBuilder;
use crate::rclone::error_handler::{RcloneError, RcloneResult};
use crate::rclone::process_manager::ProcessManager;
use crate::rclone::progress_monitor::{ProgressMonitor, ProgressUpdate};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum ConflictStrategy {
    Replace,
    Skip,
    KeepBoth,
    Ask,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum TransferType {
    Copy,
    Move,
    Download,
    Upload,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum TransferState {
    Queued,
    Running,
    Paused,
    Completed,
    Failed(String),
    Cancelled,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TransferTask {
    pub id: String,
    pub name: String,
    pub transfer_type: TransferType,
    pub source_remote: String,
    pub source_path: String,
    pub dest_remote: String,
    pub dest_path: String,
    pub conflict_strategy: ConflictStrategy,
    pub state: TransferState,
    pub total_bytes: i64,
    pub bytes_transferred: i64,
    pub speed_bytes_per_sec: f64,
    pub eta_seconds: Option<i64>,
    pub percentage: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub concurrent_transfers: Option<u32>,
    pub chunk_size_mb: Option<u32>,
    pub bandwidth_limit: Option<String>,
    pub verify_checksum: Option<bool>,
    pub max_retries: Option<u32>,
}

pub struct TransferManager {
    process_manager: Arc<ProcessManager>,
    command_builder: RcloneCommandBuilder,
    active_cancel_tokens: Arc<Mutex<HashMap<String, oneshot::Sender<()>>>>,
    tasks: Arc<Mutex<HashMap<String, TransferTask>>>,
}

impl TransferManager {
    pub fn new(
        process_manager: Arc<ProcessManager>,
        command_builder: RcloneCommandBuilder,
    ) -> Self {
        Self {
            process_manager,
            command_builder,
            active_cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
            tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Registers a new transfer task in memory
    pub async fn queue_transfer(&self, task: TransferTask) {
        let mut map = self.tasks.lock().await;
        map.insert(task.id.clone(), task);
    }

    /// Gets all current transfer tasks
    pub async fn get_all_transfers(&self) -> Vec<TransferTask> {
        let map = self.tasks.lock().await;
        let mut list: Vec<TransferTask> = map.values().cloned().collect();
        list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        list
    }

    /// Cancels an active transfer
    pub async fn cancel_transfer(&self, transfer_id: &str) -> bool {
        let mut tokens = self.active_cancel_tokens.lock().await;
        if let Some(tx) = tokens.remove(transfer_id) {
            let _ = tx.send(());
            let mut tasks = self.tasks.lock().await;
            if let Some(task) = tasks.get_mut(transfer_id) {
                task.state = TransferState::Cancelled;
            }
            true
        } else {
            false
        }
    }

    /// Executes a file copy or move transfer with streaming progress
    pub async fn execute_transfer<F>(
        &self,
        task: TransferTask,
        progress_callback: F,
    ) -> RcloneResult<()>
    where
        F: Fn(ProgressUpdate) + Send + Sync + 'static,
    {
        let transfer_id = task.id.clone();
        let (tx, rx) = oneshot::channel::<()>();

        {
            let mut tokens = self.active_cancel_tokens.lock().await;
            tokens.insert(transfer_id.clone(), tx);
            let mut tasks = self.tasks.lock().await;
            if let Some(t) = tasks.get_mut(&transfer_id) {
                t.state = TransferState::Running;
            }
        }

        let args = self.command_builder.copy_file_with_stats(
            &task.source_remote,
            &task.source_path,
            &task.dest_remote,
            &task.dest_path,
            task.concurrent_transfers,
            task.chunk_size_mb,
            task.bandwidth_limit.as_deref(),
            task.verify_checksum,
            task.max_retries,
        );

        let mut monitor = ProgressMonitor::new(transfer_id.clone());
        let tasks_ref = self.tasks.clone();
        let progress_cb = Arc::new(progress_callback);

        let result = self
            .process_manager
            .stream_process(
                &args,
                move |line| {
                    if let Some(update) = monitor.process_line(line) {
                        progress_cb(update.clone());
                    }
                },
                rx,
            )
            .await;

        // Cleanup cancel token
        {
            let mut tokens = self.active_cancel_tokens.lock().await;
            tokens.remove(&transfer_id);
            let mut tasks = tasks_ref.lock().await;
            if let Some(t) = tasks.get_mut(&transfer_id) {
                match &result {
                    Ok(_) => {
                        t.state = TransferState::Completed;
                        t.percentage = 100.0;
                    }
                    Err(RcloneError::TransferCancelled) => {
                        t.state = TransferState::Cancelled;
                    }
                    Err(e) => {
                        t.state = TransferState::Failed(e.to_string());
                    }
                }
            }
        }

        result
    }
}
