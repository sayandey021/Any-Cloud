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
    rclone: State<'_, RcloneManager>,
) -> Result<bool, String> {
    Ok(rclone.transfer_manager.cancel_transfer(&transfer_id).await)
}

#[tauri::command]
pub async fn get_transfers(
    rclone: State<'_, RcloneManager>,
) -> Result<Vec<TransferTask>, String> {
    Ok(rclone.transfer_manager.get_all_transfers().await)
}
