use serde::Deserialize;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;
use crate::database::{CachedFile, CloudAccount, Database};
use crate::events::{AccountSyncedPayload, EVENT_ACCOUNT_SYNCED};
use crate::rclone::RcloneManager;

#[derive(Debug, Deserialize)]
pub struct AddAccountRequest {
    pub provider: String,
    pub name: String,
    pub label: Option<String>,
    pub parameters: Option<Vec<(String, String)>>,
}

pub fn map_provider_to_rclone_type(provider: &str) -> &'static str {
    match provider.to_lowercase().as_str() {
        "gdrive" | "drive" | "google drive" => "drive",
        "onedrive" | "one drive" => "onedrive",
        "s3" | "amazon s3" | "aws" => "s3",
        "dropbox" => "dropbox",
        "box" => "box",
        "mega" => "mega",
        "webdav" | "nextcloud" => "webdav",
        "local" | "hard-drive" => "local",
        "alibabacloud" | "alibaba" | "aliyun" => "s3",
        "cloudinary" => "cloudinary",
        "googlephotos" | "google_photos" | "google photos" => "google photos",
        "huaweidrive" | "huawei" => "huaweidrive",
        "iclouddrive" | "icloud" => "iclouddrive",
        "kdrive" | "infomaniak" => "kdrive",
        "koofr" => "koofr",
        "linkbox" => "linkbox",
        "mailru" | "mail.ru" => "mailru",
        "pcloud" => "pcloud",
        "pikpak" => "pikpak",
        "protondrive" | "proton" => "protondrive",
        "qingstor" => "qingstor",
        "zohoworkdrive" | "zoho" => "zoho",
        _ => "drive",
    }
}

#[tauri::command]
pub async fn get_accounts(
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<Vec<CloudAccount>, String> {
    let mut accounts = db.accounts.get_all().map_err(|e| e.to_string())?;

    // Auto-seed Local Computer Storage & existing rclone remotes ONLY on initial first setup
    if db.get_setting("has_seeded_initial_accounts").is_none() {
        let _ = db.set_setting("has_seeded_initial_accounts", "true");

        let home_dir = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| "C:\\".to_string());

        let now = chrono::Utc::now().to_rfc3339();

        // 1. Local Computer Storage
        let local_acc = CloudAccount {
            id: "local-storage".to_string(),
            provider: "local".to_string(),
            name: "Local Computer".to_string(),
            label: Some(format!("Local Storage ({})", home_dir)),
            status: "connected".to_string(),
            quota_total: None,
            quota_used: None,
            quota_free: None,
            last_synced_at: None,
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        let _ = db.accounts.upsert(&local_acc);
        accounts.push(local_acc);

        // 2. Discover any existing configured remotes in rclone.conf
        if let Ok(remotes) = rclone.remote_manager.list_remotes().await {
            for remote in remotes {
                let name = remote.trim_end_matches(':').to_string();
                if name.is_empty() {
                    continue;
                }
                let quota = rclone
                    .remote_manager
                    .get_remote_quota(&name)
                    .await
                    .unwrap_or_default();
                let cloud_acc = CloudAccount {
                    id: Uuid::new_v4().to_string(),
                    provider: "cloud".to_string(),
                    name: name.clone(),
                    label: Some(name.clone()),
                    status: "connected".to_string(),
                    quota_total: quota.total,
                    quota_used: quota.used,
                    quota_free: quota.free,
                    last_synced_at: None,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                };
                let _ = db.accounts.upsert(&cloud_acc);
                accounts.push(cloud_acc);
            }
        }
    }

    Ok(accounts)
}

#[tauri::command]
pub async fn authorize_oauth_cloud(
    provider: String,
    rclone: State<'_, RcloneManager>,
) -> Result<String, String> {
    let rclone_type = map_provider_to_rclone_type(&provider);
    rclone
        .authorize_cloud(rclone_type)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_oauth() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = std::process::Command::new("taskkill");
        cmd.args(["/F", "/IM", "rclone.exe"]);
        cmd.creation_flags(CREATE_NO_WINDOW);
        let _ = cmd.output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = std::process::Command::new("pkill")
            .arg("rclone")
            .output();
    }
    Ok(true)
}

#[tauri::command]
pub async fn add_account(
    req: AddAccountRequest,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<CloudAccount, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let account_id = Uuid::new_v4().to_string();
    let rclone_type = map_provider_to_rclone_type(&req.provider);

    if req.provider == "local" {
        let account = CloudAccount {
            id: account_id,
            provider: "local".to_string(),
            name: req.name.clone(),
            label: req.label.or(Some(req.name)),
            status: "connected".to_string(),
            quota_total: None,
            quota_used: None,
            quota_free: None,
            last_synced_at: None,
            created_at: now.clone(),
            updated_at: now,
        };
        db.accounts.upsert(&account).map_err(|e| e.to_string())?;
        return Ok(account);
    }

    // Configure cloud remote in rclone.conf
    let mut param_refs: Vec<(&str, &str)> = Vec::new();
    if let Some(ref params) = req.parameters {
        for (k, v) in params {
            param_refs.push((k.as_str(), v.as_str()));
        }
    }

    if (req.provider == "alibabacloud" || req.provider == "alibaba") && !param_refs.iter().any(|(k, _)| *k == "provider") {
        param_refs.push(("provider", "Alibaba"));
    }
    if req.provider == "koofr" && !param_refs.iter().any(|(k, _)| *k == "provider") {
        param_refs.push(("provider", "koofr"));
    }

    if let Err(e) = rclone
        .remote_manager
        .create_remote(&req.name, rclone_type, &param_refs)
        .await
    {
        return Err(format!("Failed to configure cloud remote: {}", e));
    }

    // Try fetching quota
    let quota = rclone
        .remote_manager
        .get_remote_quota(&req.name)
        .await
        .unwrap_or_default();

    let account = CloudAccount {
        id: account_id,
        provider: req.provider,
        name: req.name.clone(),
        label: req.label.or(Some(req.name)),
        status: "connected".to_string(),
        quota_total: quota.total,
        quota_used: quota.used,
        quota_free: quota.free,
        last_synced_at: None,
        created_at: now.clone(),
        updated_at: now,
    };

    db.accounts.upsert(&account).map_err(|e| e.to_string())?;
    Ok(account)
}

#[tauri::command]
pub async fn remove_account(
    account_id: String,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<bool, String> {
    if let Ok(Some(account)) = db.accounts.get_by_id(&account_id) {
        if account.provider != "local" {
            let _ = rclone.remote_manager.delete_remote(&account.name).await;
        }
    }
    db.files
        .delete_account_files(&account_id)
        .map_err(|e| e.to_string())?;
    db.accounts.delete(&account_id).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn sync_account_metadata(
    account_id: String,
    app_handle: AppHandle,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<usize, String> {
    let mut account = db
        .accounts
        .get_by_id(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account {} not found", account_id))?;

    // Fetch cloud items recursively
    let items = match rclone.list_directory(&account.name, "", true).await {
        Ok(res) => res,
        Err(err) => {
            log::warn!("Live rclone listing failed during sync: {}", err);
            return Err(err.to_string());
        }
    };

    let now = chrono::Utc::now().to_rfc3339();
    let mut cached_files = Vec::new();

    for item in &items {
        let full_path = item.path.trim_matches('/').to_string();
        let parent_path = if let Some(idx) = full_path.rfind('/') {
            full_path[..idx].to_string()
        } else {
            String::new()
        };

        cached_files.push(CachedFile {
            id: Uuid::new_v4().to_string(),
            account_id: account_id.clone(),
            remote_path: full_path,
            parent_path,
            name: item.name.clone(),
            is_dir: item.is_dir,
            size: if item.size < 0 { 0 } else { item.size },
            mime_type: if item.mime_type.is_empty() {
                None
            } else {
                Some(item.mime_type.clone())
            },
            mod_time: if item.mod_time.is_empty() {
                None
            } else {
                Some(item.mod_time.clone())
            },
            hash: None,
            is_favorite: false,
            is_trash: false,
            last_accessed_at: None,
            cached_at: now.clone(),
        });
    }

    let count = cached_files.len();
    db.files
        .batch_upsert(&cached_files)
        .map_err(|e| e.to_string())?;

    // Update quota
    if let Ok(quota) = rclone.remote_manager.get_remote_quota(&account.name).await {
        account.quota_total = quota.total;
        account.quota_used = quota.used;
        account.quota_free = quota.free;
    }

    account.last_synced_at = Some(now.clone());
    account.updated_at = now.clone();
    let _ = db.accounts.upsert(&account);

    // Emit event to frontend
    let _ = app_handle.emit(
        EVENT_ACCOUNT_SYNCED,
        AccountSyncedPayload {
            account_id: account_id.clone(),
            total_files_synced: count,
            timestamp: now,
        },
    );

    Ok(count)
}
