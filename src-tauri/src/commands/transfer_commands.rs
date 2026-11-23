use serde::Deserialize;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;
use crate::database::{Database, HistoricalTransfer};
use crate::events::{
    TransferFinishedPayload, EVENT_TRANSFER_COMPLETED,
    EVENT_TRANSFER_FAILED, EVENT_TRANSFER_PROGRESS,
};
use crate::rclone::transfer_manager::{
    ConflictStrategy, TransferState, TransferTask, TransferType,
};
use crate::rclone::RcloneManager;

#[derive(Debug, Deserialize)]
pub struct StartTransferRequest {
    pub name: String,
    pub transfer_type: String, // "copy" | "move" | "download" | "upload"
    pub source_remote: String,
    pub source_path: String,
    pub dest_remote: String,
    pub dest_path: String,
    pub conflict_strategy: Option<String>,
    pub total_bytes: Option<i64>,
    pub concurrent_transfers: Option<u32>,
    pub chunk_size_mb: Option<u32>,
    pub bandwidth_limit: Option<String>,
    pub verify_checksum: Option<bool>,
    pub max_retries: Option<u32>,
}

#[tauri::command]
pub async fn start_transfer(
    req: StartTransferRequest,
    app_handle: AppHandle,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<TransferTask, String> {
    let transfer_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now();

    let transfer_type = match req.transfer_type.to_lowercase().as_str() {
        "move" => TransferType::Move,
        "download" => TransferType::Download,
        "upload" => TransferType::Upload,
        _ => TransferType::Copy,
    };

    let conflict = match req.conflict_strategy.as_deref() {
        Some("skip") => ConflictStrategy::Skip,
        Some("keep_both") => ConflictStrategy::KeepBoth,
        Some("ask") => ConflictStrategy::Ask,
        _ => ConflictStrategy::Replace,
    };

    let task = TransferTask {
        id: transfer_id.clone(),
        name: req.name.clone(),
        transfer_type: transfer_type.clone(),
        source_remote: req.source_remote.clone(),
        source_path: req.source_path.clone(),
        dest_remote: req.dest_remote.clone(),
        dest_path: req.dest_path.clone(),
        conflict_strategy: conflict.clone(),
        state: TransferState::Queued,
        total_bytes: req.total_bytes.unwrap_or(0),
        bytes_transferred: 0,
        speed_bytes_per_sec: 0.0,
        eta_seconds: None,
        percentage: 0.0,
        created_at: now,
        concurrent_transfers: req.concurrent_transfers,
        chunk_size_mb: req.chunk_size_mb,
        bandwidth_limit: req.bandwidth_limit.clone(),
        verify_checksum: req.verify_checksum,
        max_retries: req.max_retries,
    };

    // Save initial record to DB
    let hist = HistoricalTransfer {
        id: transfer_id.clone(),
        name: req.name.clone(),
        transfer_type: req.transfer_type.clone(),
        source_remote: req.source_remote.clone(),
        source_path: req.source_path.clone(),
        dest_remote: req.dest_remote.clone(),
        dest_path: req.dest_path.clone(),
        conflict_strategy: format!("{:?}", conflict),
        state: "Running".to_string(),
        total_bytes: req.total_bytes.unwrap_or(0),
        bytes_transferred: 0,
        error_message: None,
        started_at: now.to_rfc3339(),
        completed_at: None,
    };
    let _ = db.transfers.save_transfer(&hist);

    rclone.transfer_manager.queue_transfer(task.clone()).await;

    // Spawn background worker for this transfer
    let transfer_mgr = rclone.transfer_manager.clone();
    let task_clone = task.clone();
    let app_handle_clone = app_handle.clone();
    let db_clone = db.inner().clone();

    tokio::spawn(async move {
        let app_handle_progress = app_handle_clone.clone();
        let res = transfer_mgr
            .execute_transfer(task_clone, move |update| {
                let _ = app_handle_progress.emit(EVENT_TRANSFER_PROGRESS, update);
            })
            .await;

        let completed_time = chrono::Utc::now().to_rfc3339();
        match res {
            Ok(_) => {
                let _ = app_handle_clone.emit(
                    EVENT_TRANSFER_COMPLETED,
                    TransferFinishedPayload {
                        transfer_id: transfer_id.clone(),
                        success: true,
                        error: None,
                    },
                );

                let mut update_hist = hist;
                update_hist.state = "Completed".to_string();
                update_hist.completed_at = Some(completed_time);
                let _ = db_clone.transfers.save_transfer(&update_hist);
            }
            Err(e) => {
                let err_str = e.to_string();
                let _ = app_handle_clone.emit(
                    EVENT_TRANSFER_FAILED,
                    TransferFinishedPayload {
                        transfer_id: transfer_id.clone(),
                        success: false,
                        error: Some(err_str.clone()),
                    },
                );

                let mut update_hist = hist;
                update_hist.state = "Failed".to_string();
                update_hist.error_message = Some(err_str);
                update_hist.completed_at = Some(completed_time);
                let _ = db_clone.transfers.save_transfer(&update_hist);
            }
        }
    });

    Ok(task)
}

#[tauri::command]
pub async fn cancel_transfer(
    transfer_id: String,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<bool, String> {
    let cancelled = rclone.transfer_manager.cancel_transfer(&transfer_id).await;
    let _ = db.transfers.update_state(&transfer_id, "Cancelled", None);
    Ok(cancelled)
}

#[tauri::command]
pub async fn get_transfers(
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<Vec<TransferTask>, String> {
    // 1. Mark interrupted transfers from previous app runs as cancelled
    let _ = db.transfers.mark_interrupted_as_cancelled();

    // 2. Fetch current in-memory active tasks
    let active_tasks = rclone.transfer_manager.get_all_transfers().await;
    let active_ids: std::collections::HashSet<String> =
        active_tasks.iter().map(|t| t.id.clone()).collect();

    // 3. Load historical transfers from SQLite database
    let mut all_tasks = active_tasks;
    if let Ok(history) = db.transfers.get_recent_transfers(200) {
        for hist in history {
            if !active_ids.contains(&hist.id) {
                let transfer_type = match hist.transfer_type.to_lowercase().as_str() {
                    "move" => TransferType::Move,
                    "download" => TransferType::Download,
                    "upload" => TransferType::Upload,
                    _ => TransferType::Copy,
                };

                let conflict = match hist.conflict_strategy.as_str() {
                    s if s.contains("Skip") => ConflictStrategy::Skip,
                    s if s.contains("KeepBoth") => ConflictStrategy::KeepBoth,
                    s if s.contains("Ask") => ConflictStrategy::Ask,
                    _ => ConflictStrategy::Replace,
                };

                let state = match hist.state.as_str() {
                    "Completed" => TransferState::Completed,
                    "Cancelled" => TransferState::Cancelled,
                    "Failed" => TransferState::Failed(
                        hist.error_message
                            .unwrap_or_else(|| "Transfer failed".to_string()),
                    ),
                    _ => TransferState::Cancelled,
                };

                let created_at = chrono::DateTime::parse_from_rfc3339(&hist.started_at)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now());

                let percentage = if hist.total_bytes > 0 {
                    (hist.bytes_transferred as f64 / hist.total_bytes as f64 * 100.0)
                        .clamp(0.0, 100.0)
                } else if hist.state == "Completed" {
                    100.0
                } else {
                    0.0
                };

                all_tasks.push(TransferTask {
                    id: hist.id,
                    name: hist.name,
                    transfer_type,
                    source_remote: hist.source_remote,
                    source_path: hist.source_path,
                    dest_remote: hist.dest_remote,
                    dest_path: hist.dest_path,
                    conflict_strategy: conflict,
                    state,
                    total_bytes: hist.total_bytes,
                    bytes_transferred: hist.bytes_transferred,
                    speed_bytes_per_sec: 0.0,
                    eta_seconds: None,
                    percentage,
                    created_at,
                    concurrent_transfers: None,
                    chunk_size_mb: None,
                    bandwidth_limit: None,
                    verify_checksum: None,
                    max_retries: None,
                });
            }
        }
    }

    // Sort newest transfers first
    all_tasks.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(all_tasks)
}

#[tauri::command]
pub async fn clear_transfer_history(
    db: State<'_, Database>,
) -> Result<bool, String> {
    db.transfers.clear_history().map_err(|e| e.to_string())?;
    Ok(true)
}
