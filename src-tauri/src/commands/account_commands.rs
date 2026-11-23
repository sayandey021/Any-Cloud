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
        "webdav" | "nextcloud" | "owncloud" => "webdav",
        "local" | "hard-drive" => "local",
        "alibabacloud" | "alibaba" | "aliyun" => "s3",
        "cloudinary" => "cloudinary",
        "googlephotos" | "google_photos" | "google photos" | "gphotos" => "gphotos",
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
        "b2" | "backblaze" | "backblaze b2" => "b2",
        "googlecloudstorage" | "gcs" => "s3",
        "azureblob" | "azure" => "azureblob",
        "azurefiles" => "azurefiles",
        "yandex" | "yandex disk" => "yandex",
        "sftp" | "ssh" => "sftp",
        "ftp" | "ftps" => "ftp",
        "smb" | "cifs" => "smb",
        "http" | "https" => "http",
        "hdfs" => "hdfs",
        "jottacloud" => "jottacloud",
        "opendrive" => "opendrive",
        "hidrive" => "hidrive",
        "fichier" | "1fichier" => "fichier",
        "pixeldrain" => "pixeldrain",
        "putio" | "put.io" => "putio",
        "premiumizeme" | "premiumize.me" => "premiumizeme",
        "sugarsync" => "sugarsync",
        "filen" => "filen",
        "filescom" | "files.com" => "filescom",
        "gofile" => "gofile",
        "internetarchive" | "archive" => "internetarchive",
        "internxt" => "internxt",
        "seafile" => "seafile",
        "sharefile" => "sharefile",
        "drime" => "drime",
        "r2" | "cloudflare r2" => "s3",
        "digitaloceanspaces" | "spaces" => "s3",
        "wasabi" => "s3",
        "minio" => "s3",
        "oracleobjectstorage" | "oci" | "oos" => "oracleobjectstorage",
        "swift" | "openstack" => "swift",
        "netstorage" | "akamai" => "netstorage",
        "imagekit" => "imagekit",
        "storj" => "storj",
        "sia" => "sia",
        "filebase" => "s3",
        "filelu" => "filelu",
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
    extra_args: Option<Vec<String>>,
    rclone: State<'_, RcloneManager>,
) -> Result<String, String> {
    let rclone_type = map_provider_to_rclone_type(&provider);
    let mut args: Vec<String> = extra_args.unwrap_or_default();

    // For Zoho WorkDrive, ensure region flag is present (defaulting to com if unspecified)
    if rclone_type == "zoho" && !args.iter().any(|a| a.starts_with("--zoho-region")) {
        args.push("--zoho-region=com".to_string());
    }

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    rclone
        .authorize_cloud(rclone_type, &arg_refs)
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

async fn fetch_onedrive_drive_info(access_token: &str) -> Result<(String, String), String> {
    let mut cmd = tokio::process::Command::new("curl.exe");
    crate::platform::apply_platform_process_flags(&mut cmd);
    cmd.args(&[
        "-s",
        "-H",
        &format!("Authorization: Bearer {}", access_token),
        "https://graph.microsoft.com/v1.0/me/drive",
    ]);
    cmd.stdin(std::process::Stdio::null());
    let output = cmd.output().await.map_err(|e| e.to_string())?;
    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
            let id = json.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let drive_type = json
                .get("driveType")
                .and_then(|v| v.as_str())
                .unwrap_or("personal")
                .to_string();
            if !id.is_empty() {
                return Ok((id, drive_type));
            }
        }
    }
    Err("Failed to query Microsoft Graph API".to_string())
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
    let p_lower = req.provider.to_lowercase();

    // Strict validation
    if p_lower == "local" {
        let path_val = req
            .parameters
            .as_ref()
            .and_then(|p| p.iter().find(|(k, _)| k == "path").map(|(_, v)| v.trim()))
            .unwrap_or("");
        if path_val.is_empty() {
            return Err("Folder or drive path is required for local storage.".to_string());
        }
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
    } else if ["ftp", "sftp", "smb", "hdfs"].contains(&p_lower.as_str()) {
        let has_host = req
            .parameters
            .as_ref()
            .map(|params| params.iter().any(|(k, v)| k == "host" && !v.trim().is_empty()))
            .unwrap_or(false);
        if !has_host {
            return Err(format!("Server Host / IP is required to connect to {}.", req.provider.to_uppercase()));
        }
    } else if ["webdav", "http"].contains(&p_lower.as_str()) {
        let has_url = req
            .parameters
            .as_ref()
            .map(|params| params.iter().any(|(k, v)| k == "url" && !v.trim().is_empty()))
            .unwrap_or(false);
        if !has_url {
            return Err(format!("Server URL is required to connect to {}.", req.provider.to_uppercase()));
        }
    } else if ["r2", "minio", "alibabacloud", "swift", "oracleobjectstorage", "qingstor", "netstorage"].contains(&p_lower.as_str()) {
        let has_endpoint = req
            .parameters
            .as_ref()
            .map(|params| params.iter().any(|(k, v)| (k == "endpoint" || k == "url_endpoint") && !v.trim().is_empty()))
            .unwrap_or(false);
        if !has_endpoint {
            return Err(format!("Endpoint URL is required for {}.", req.provider));
        }
    } else if ["s3", "wasabi", "digitaloceanspaces", "filebase"].contains(&p_lower.as_str()) {
        let has_keys = req
            .parameters
            .as_ref()
            .map(|params| {
                params.iter().any(|(k, v)| k == "access_key_id" && !v.trim().is_empty())
                    && params.iter().any(|(k, v)| k == "secret_access_key" && !v.trim().is_empty())
            })
            .unwrap_or(false);
        if !has_keys {
            return Err(format!("Access Key ID and Secret Access Key are required for {}.", req.provider));
        }
    } else if ["b2", "azureblob", "azurefiles"].contains(&p_lower.as_str()) {
        let has_keys = req
            .parameters
            .as_ref()
            .map(|params| {
                (params.iter().any(|(k, v)| (k == "account" || k == "access_key_id") && !v.trim().is_empty()))
                    && (params.iter().any(|(k, v)| (k == "key" || k == "secret_access_key") && !v.trim().is_empty()))
            })
            .unwrap_or(false);
        if !has_keys {
            return Err(format!("Account credentials/keys are required for {}.", req.provider));
        }
    } else if ["cloudinary", "imagekit"].contains(&p_lower.as_str()) {
        let has_keys = req
            .parameters
            .as_ref()
            .map(|params| params.len() >= 2)
            .unwrap_or(false);
        if !has_keys {
            return Err(format!("API configuration keys are required for {}.", req.provider));
        }
    } else if ["seafile"].contains(&p_lower.as_str()) {
        let has_url = req
            .parameters
            .as_ref()
            .map(|params| params.iter().any(|(k, v)| (k == "url" || k == "endpoint") && !v.trim().is_empty()))
            .unwrap_or(false);
        if !has_url {
            return Err("Seafile Server URL is required.".to_string());
        }
    } else if ["filescom", "files.com"].contains(&p_lower.as_str()) {
        let has_site = req
            .parameters
            .as_ref()
            .map(|params| params.iter().any(|(k, v)| (k == "site" || k == "endpoint") && !v.trim().is_empty()))
            .unwrap_or(false);
        if !has_site {
            return Err("Files.com Site Subdomain is required.".to_string());
        }
    } else if ["gofile"].contains(&p_lower.as_str()) {
        let has_token = req
            .parameters
            .as_ref()
            .map(|params| params.iter().any(|(k, v)| (k == "access_token" || k == "api_key" || k == "token") && !v.trim().is_empty()))
            .unwrap_or(false);
        if !has_token {
            return Err("Gofile Account API Token is required.".to_string());
        }
    } else if ["internetarchive", "archive"].contains(&p_lower.as_str()) {
        let has_keys = req
            .parameters
            .as_ref()
            .map(|params| {
                params.iter().any(|(k, v)| (k == "access_key_id" || k == "api_key") && !v.trim().is_empty())
                    && params.iter().any(|(k, v)| (k == "secret_access_key" || k == "secret_key" || k == "pass") && !v.trim().is_empty())
            })
            .unwrap_or(false);
        if !has_keys {
            return Err("Internet Archive IAS3 Access Key and Secret Key are required.".to_string());
        }
    }

    // Configure cloud remote in rclone.conf
    let mut param_entries: Vec<(String, String)> = Vec::new();
    let mut extracted_port = String::new();

    if let Some(ref params) = req.parameters {
        for (k, v) in params {
            if (k == "host" || k == "url") && ["ftp", "sftp", "smb", "hdfs"].contains(&p_lower.as_str()) {
                let mut h = v.trim();
                // Strip protocol scheme: ftp://, ftps://, sftp://, smb://, http://, https://
                if let Some(idx) = h.find("://") {
                    h = &h[idx + 3..];
                }
                // Strip credentials user:pass@
                if let Some(idx) = h.rfind('@') {
                    h = &h[idx + 1..];
                }
                // Strip trailing path segment
                if let Some(idx) = h.find('/') {
                    h = &h[..idx];
                }
                // Extract port if formatted as host:port
                if h.contains(':') && !h.ends_with(']') {
                    if let Some(idx) = h.rfind(':') {
                        let port_part = &h[idx + 1..];
                        if !port_part.is_empty() && port_part.chars().all(|c| c.is_ascii_digit()) {
                            extracted_port = port_part.to_string();
                            h = &h[..idx];
                        }
                    }
                }
                param_entries.push(("host".to_string(), h.to_string()));
            } else {
                param_entries.push((k.clone(), v.clone()));
            }
        }
    }

    if !extracted_port.is_empty() && !param_entries.iter().any(|(k, _)| k == "port") {
        param_entries.push(("port".to_string(), extracted_port));
    }

    if (req.provider == "alibabacloud" || req.provider == "alibaba") && !param_entries.iter().any(|(k, _)| k == "provider") {
        param_entries.push(("provider".to_string(), "Alibaba".to_string()));
    }
    if (req.provider == "r2" || req.provider == "cloudflare r2") && !param_entries.iter().any(|(k, _)| k == "provider") {
        param_entries.push(("provider".to_string(), "Cloudflare".to_string()));
    }
    if (req.provider == "digitaloceanspaces" || req.provider == "spaces") && !param_entries.iter().any(|(k, _)| k == "provider") {
        param_entries.push(("provider".to_string(), "DigitalOcean".to_string()));
    }
    if req.provider == "wasabi" && !param_entries.iter().any(|(k, _)| k == "provider") {
        param_entries.push(("provider".to_string(), "Wasabi".to_string()));
    }
    if req.provider == "minio" && !param_entries.iter().any(|(k, _)| k == "provider") {
        param_entries.push(("provider".to_string(), "Minio".to_string()));
    }
    if req.provider == "filebase" && !param_entries.iter().any(|(k, _)| k == "provider") {
        param_entries.push(("provider".to_string(), "Filebase".to_string()));
    }
    if req.provider == "googlecloudstorage" || req.provider == "gcs" {
        if !param_entries.iter().any(|(k, _)| k == "provider") {
            param_entries.push(("provider".to_string(), "Google".to_string()));
        }
        if !param_entries.iter().any(|(k, _)| k == "endpoint") {
            param_entries.push(("endpoint".to_string(), "https://storage.googleapis.com".to_string()));
        }
    }
    if req.provider == "gofile" {
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "api_key" || k == "token") {
            let val = param_entries[pos].1.clone();
            param_entries.remove(pos);
            param_entries.push(("access_token".to_string(), val));
        }
    }
    if req.provider == "koofr" {
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "pass") {
            let val = param_entries[pos].1.clone();
            param_entries.remove(pos);
            param_entries.push(("password".to_string(), val));
        }
        if !param_entries.iter().any(|(k, _)| k == "provider") {
            param_entries.push(("provider".to_string(), "koofr".to_string()));
        }
    }
    if req.provider == "seafile" {
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "endpoint") {
            let val = param_entries[pos].1.clone();
            param_entries.remove(pos);
            param_entries.push(("url".to_string(), val));
        }
    }
    if req.provider == "internxt" {
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "user" || k == "username") {
            let val = param_entries[pos].1.clone();
            param_entries.remove(pos);
            param_entries.push(("email".to_string(), val));
        }
    }
    if req.provider == "filescom" || req.provider == "files.com" {
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "endpoint" || k == "url") {
            let mut val = param_entries[pos].1.clone();
            val = val.replace("https://", "").replace("http://", "").trim_end_matches('/').to_string();
            if let Some(idx) = val.find(".files.com") {
                val = val[..idx].to_string();
            }
            param_entries.remove(pos);
            param_entries.push(("site".to_string(), val));
        }
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "user") {
            let val = param_entries[pos].1.clone();
            param_entries.remove(pos);
            param_entries.push(("username".to_string(), val));
        }
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "pass") {
            let val = param_entries[pos].1.clone();
            param_entries.remove(pos);
            param_entries.push(("password".to_string(), val));
        }
    }
    if req.provider == "internetarchive" || req.provider == "archive" {
        if let Some(pos) = param_entries.iter().position(|(k, _)| k == "api_key") {
            let val = param_entries[pos].1.clone();
            param_entries.remove(pos);
            param_entries.push(("access_key_id".to_string(), val));
        }
    }
    if (req.provider == "zohoworkdrive" || req.provider == "zoho") && !param_entries.iter().any(|(k, _)| k == "region") {
        param_entries.push(("region".to_string(), "com".to_string()));
    }

    if req.provider == "b2" || req.provider == "azureblob" || req.provider == "azurefiles" {
        let mut resolved_account = String::new();
        let mut resolved_key = String::new();
        if !param_entries.iter().any(|(k, _)| k == "account") {
            if let Some((_, v)) = param_entries.iter().find(|(k, _)| k == "access_key_id") {
                resolved_account = v.clone();
            }
        }
        if !param_entries.iter().any(|(k, _)| k == "key") {
            if let Some((_, v)) = param_entries.iter().find(|(k, _)| k == "secret_access_key") {
                resolved_key = v.clone();
            }
        }
        if !resolved_account.is_empty() {
            param_entries.push(("account".to_string(), resolved_account));
        }
        if !resolved_key.is_empty() {
            param_entries.push(("key".to_string(), resolved_key));
        }
    }

    if req.provider == "onedrive" {
        let mut resolved_drive_id = String::new();
        let mut resolved_drive_type = String::new();
        let has_drive_id = param_entries.iter().any(|(k, _)| k == "drive_id");
        let has_drive_type = param_entries.iter().any(|(k, _)| k == "drive_type");

        if !has_drive_id || !has_drive_type {
            if let Some((_, token_val)) = param_entries.iter().find(|(k, _)| k == "token") {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(token_val) {
                    if let Some(access_token) = json.get("access_token").and_then(|v| v.as_str()) {
                        if let Ok((id, dtype)) = fetch_onedrive_drive_info(access_token).await {
                            resolved_drive_id = id;
                            resolved_drive_type = dtype;
                        }
                    }
                }
            }
        }

        if !has_drive_id && !resolved_drive_id.is_empty() {
            param_entries.push(("drive_id".to_string(), resolved_drive_id));
        }
        if !has_drive_type {
            if !resolved_drive_type.is_empty() {
                param_entries.push(("drive_type".to_string(), resolved_drive_type));
            } else {
                param_entries.push(("drive_type".to_string(), "personal".to_string()));
            }
        }
    }

    let param_refs: Vec<(&str, &str)> = param_entries
        .iter()
        .map(|(k, v)| (k.as_str(), v.as_str()))
        .collect();

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
