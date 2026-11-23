use serde::{Deserialize, Serialize};
use tauri::State;
use crate::rclone::output_parser::{RcloneAbout, RcloneVersionInfo};
use crate::rclone::RcloneManager;

#[derive(Debug, Serialize, Deserialize)]
pub struct RcloneStatusResponse {
    pub is_installed: bool,
    pub binary_path: String,
    pub version: Option<RcloneVersionInfo>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn check_rclone_status(
    rclone: State<'_, RcloneManager>,
) -> Result<RcloneStatusResponse, String> {
    let binary_path = rclone.binary_path().to_string_lossy().to_string();
    match rclone.check_availability().await {
        Ok(version) => Ok(RcloneStatusResponse {
            is_installed: true,
            binary_path,
            version: Some(version),
            error: None,
        }),
        Err(err) => Ok(RcloneStatusResponse {
            is_installed: false,
            binary_path,
            version: None,
            error: Some(err.to_string()),
        }),
    }
}

#[tauri::command]
pub async fn list_configured_remotes(
    rclone: State<'_, RcloneManager>,
) -> Result<Vec<String>, String> {
    rclone
        .remote_manager
        .list_remotes()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_remote_quota(
    remote_name: String,
    rclone: State<'_, RcloneManager>,
) -> Result<RcloneAbout, String> {
    rclone
        .remote_manager
        .get_remote_quota(&remote_name)
        .await
        .map_err(|e| e.to_string())
}
