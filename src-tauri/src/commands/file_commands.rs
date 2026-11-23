use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::State;
use uuid::Uuid;
use crate::database::{CachedFile, Database};
use crate::rclone::RcloneManager;

#[derive(Debug, Serialize, Deserialize)]
pub struct ListFilesResponse {
    pub files: Vec<CachedFile>,
    pub is_from_cache: bool,
}

fn guess_mime_by_extension(filename: &str) -> Option<String> {
    let ext = filename.split('.').last()?.to_lowercase();
    let mime = match ext.as_str() {
        "txt" => "text/plain",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" | "ts" | "jsx" | "tsx" => "application/javascript",
        "json" => "application/json",
        "pdf" => "application/pdf",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "mp3" | "wav" | "flac" => "audio/mpeg",
        "mp4" | "mkv" | "mov" | "avi" => "video/mp4",
        "zip" => "application/zip",
        "tar" | "gz" => "application/gzip",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        _ => "application/octet-stream",
    };
    Some(mime.to_string())
}

fn resolve_account_local_path(account: &crate::database::CloudAccount, sub_path: &str) -> PathBuf {
    let base_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| "C:\\".to_string());

    let root_path: PathBuf = if account.name == "Local Computer" || account.name == "home" || account.name.is_empty() {
        PathBuf::from(&base_dir)
    } else if Path::new(&account.name).is_absolute() {
        PathBuf::from(&account.name)
    } else {
        PathBuf::from(&base_dir).join(&account.name)
    };

    let norm_sub = sub_path.trim_matches('/').replace('/', "\\");
    if norm_sub.is_empty() {
        root_path
    } else if Path::new(&norm_sub).is_absolute() {
        PathBuf::from(norm_sub)
    } else {
        root_path.join(norm_sub)
    }
}

fn list_local_directory(
    account: &crate::database::CloudAccount,
    path: &str,
    db: &Database,
) -> Result<ListFilesResponse, String> {
    let target_dir = resolve_account_local_path(account, path);

    if !target_dir.exists() {
        return Err(format!("Directory does not exist: {}", target_dir.display()));
    }

    let entries = std::fs::read_dir(&target_dir)
        .map_err(|e| format!("Failed to read directory {}: {}", target_dir.display(), e))?;

    let now = chrono::Utc::now().to_rfc3339();
    let norm_parent = path.trim_matches('/').to_string();
    let mut files = Vec::new();

    for entry in entries.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();
        // Skip Windows system files/folders
        if file_name.starts_with('$') || file_name == "System Volume Information" || file_name == "desktop.ini" {
            continue;
        }

        if let Ok(meta) = entry.metadata() {
            let is_dir = meta.is_dir();
            let size = if is_dir { 0 } else { meta.len() as i64 };
            let mod_time = meta.modified().ok().map(|t| {
                chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
            });

            let full_path = if norm_parent.is_empty() {
                file_name.clone()
            } else {
                format!("{}/{}", norm_parent, file_name)
            };

            let mime_type = if is_dir {
                Some("inode/directory".to_string())
            } else {
                guess_mime_by_extension(&file_name)
            };

            files.push(CachedFile {
                id: Uuid::new_v4().to_string(),
                account_id: account.id.clone(),
                remote_path: full_path,
                parent_path: norm_parent.clone(),
                name: file_name,
                is_dir,
                size,
                mime_type,
                mod_time,
                hash: None,
                is_favorite: false,
                is_trash: false,
                last_accessed_at: None,
                cached_at: now.clone(),
            });
        }
    }

    // Sort folders first, regular items before hidden dot-files, then alphabetical
    files.sort_by(|a, b| {
        let a_dot = a.name.starts_with('.');
        let b_dot = b.name.starts_with('.');
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a_dot.cmp(&b_dot))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    let _ = db.files.batch_upsert(&files);

    Ok(ListFilesResponse {
        files,
        is_from_cache: false,
    })
}

#[tauri::command]
pub async fn list_files(
    account_id: String,
    path: String,
    refresh: Option<bool>,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<ListFilesResponse, String> {
    let account = db
        .accounts
        .get_by_id(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account {} not found", account_id))?;

    // Handle Local storage directly
    if account.provider == "local" {
        return list_local_directory(&account, &path, &db);
    }

    let force_refresh = refresh.unwrap_or(false);

    // Check cached files first if not forcing refresh
    if !force_refresh {
        if let Ok(cached) = db.files.get_by_parent(&account_id, &path) {
            if !cached.is_empty() {
                return Ok(ListFilesResponse {
                    files: cached,
                    is_from_cache: true,
                });
            }
        }
    }

    // Query live Rclone
    let rclone_items = match rclone.list_directory(&account.name, &path, false).await {
        Ok(items) => items,
        Err(err) => {
            // If live fails, fall back to cached files only if cache exists
            if let Ok(cached) = db.files.get_by_parent(&account_id, &path) {
                if !cached.is_empty() {
                    return Ok(ListFilesResponse {
                        files: cached,
                        is_from_cache: true,
                    });
                }
            }
            return Err(err.to_string());
        }
    };

    let now = chrono::Utc::now().to_rfc3339();
    let norm_parent = path.trim_matches('/').to_string();

    let mut cached_files = Vec::new();
    for item in rclone_items {
        let full_path = if norm_parent.is_empty() {
            item.name.clone()
        } else {
            format!("{}/{}", norm_parent, item.name)
        };

        cached_files.push(CachedFile {
            id: Uuid::new_v4().to_string(),
            account_id: account_id.clone(),
            remote_path: full_path,
            parent_path: norm_parent.clone(),
            name: item.name,
            is_dir: item.is_dir,
            size: if item.size < 0 { 0 } else { item.size },
            mime_type: if item.mime_type.is_empty() {
                None
            } else {
                Some(item.mime_type)
            },
            mod_time: if item.mod_time.is_empty() {
                None
            } else {
                Some(item.mod_time)
            },
            hash: None,
            is_favorite: false,
            is_trash: false,
            last_accessed_at: None,
            cached_at: now.clone(),
        });
    }

    let _ = db.files.batch_upsert(&cached_files);

    // Load canonical view from DB to ensure trashed files remain hidden and sorting/favorites are preserved
    let files = db.files.get_by_parent(&account_id, &path).unwrap_or(cached_files);

    Ok(ListFilesResponse {
        files,
        is_from_cache: false,
    })
}

#[tauri::command]
pub async fn search_files(
    query: String,
    account_id: Option<String>,
    db: State<'_, Database>,
) -> Result<Vec<CachedFile>, String> {
    db.files
        .search_files(&query, account_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recent_files(
    limit: Option<usize>,
    db: State<'_, Database>,
) -> Result<Vec<CachedFile>, String> {
    db.files
        .get_recents(limit.unwrap_or(20))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_favorite_files(db: State<'_, Database>) -> Result<Vec<CachedFile>, String> {
    db.files.get_favorites().map_err(|e| e.to_string())
}

pub fn supports_native_trash(provider: &str) -> bool {
    let p = provider.to_lowercase();
    p == "drive" || p == "gdrive" || p.contains("google") || p == "jottacloud"
}

#[tauri::command]
pub async fn get_trash_files(
    account_id: Option<String>,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<Vec<CachedFile>, String> {
    let mut results: Vec<CachedFile> = Vec::new();

    // 1. Get locally tracked trash files
    let local_trash = db.files.get_trash().unwrap_or_default();
    let filtered_local: Vec<CachedFile> = if let Some(ref acc_id) = account_id {
        if !acc_id.is_empty() {
            local_trash.into_iter().filter(|f| &f.account_id == acc_id).collect()
        } else {
            local_trash
        }
    } else {
        local_trash
    };
    results.extend(filtered_local);

    // 2. Query native cloud trash for providers supporting native trash (Google Drive, Jottacloud)
    let accounts = if let Some(ref acc_id) = account_id {
        if !acc_id.is_empty() {
            if let Ok(Some(acc)) = db.accounts.get_by_id(acc_id) {
                vec![acc]
            } else {
                db.accounts.get_all().unwrap_or_default()
            }
        } else {
            db.accounts.get_all().unwrap_or_default()
        }
    } else {
        db.accounts.get_all().unwrap_or_default()
    };

    let now = chrono::Utc::now().to_rfc3339();

    for acc in accounts {
        if supports_native_trash(&acc.provider) {
            match rclone.list_trashed(&acc.name, "", &acc.provider).await {
                Ok(items) => {
                    for item in items {
                        let path_or_name = if item.path.is_empty() {
                            item.name.clone()
                        } else {
                            item.path.clone()
                        };
                        let exists = results.iter().any(|r| {
                            r.account_id == acc.id
                                && (r.name == item.name || r.remote_path == path_or_name)
                        });
                        if !exists {
                            results.push(CachedFile {
                                id: item.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
                                account_id: acc.id.clone(),
                                remote_path: path_or_name,
                                parent_path: "".to_string(),
                                name: item.name,
                                is_dir: item.is_dir,
                                size: if item.size < 0 { 0 } else { item.size },
                                mime_type: if item.mime_type.is_empty() {
                                    None
                                } else {
                                    Some(item.mime_type)
                                },
                                mod_time: if item.mod_time.is_empty() {
                                    None
                                } else {
                                    Some(item.mod_time)
                                },
                                hash: None,
                                is_favorite: false,
                                is_trash: true,
                                last_accessed_at: None,
                                cached_at: now.clone(),
                            });
                        }
                    }
                }
                Err(err) => {
                    eprintln!("Failed to list trashed items for {}: {}", acc.name, err);
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_shared_files(
    account_id: Option<String>,
    path: Option<String>,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<Vec<CachedFile>, String> {
    let subpath = path.unwrap_or_default();
    let mut results: Vec<CachedFile> = Vec::new();

    // Determine target accounts
    let accounts = if let Some(ref acc_id) = account_id {
        if !acc_id.is_empty() {
            if let Ok(Some(acc)) = db.accounts.get_by_id(acc_id) {
                vec![acc]
            } else {
                db.accounts.get_all().unwrap_or_default()
            }
        } else {
            db.accounts.get_all().unwrap_or_default()
        }
    } else {
        db.accounts.get_all().unwrap_or_default()
    };

    let now = chrono::Utc::now().to_rfc3339();

    for acc in accounts {
        let provider = acc.provider.to_lowercase();
        // Support Google Drive and OneDrive native shared-with-me
        if provider == "drive" || provider == "gdrive" || provider.contains("google") || provider == "onedrive" {
            if let Ok(items) = rclone.list_shared(&acc.name, &subpath, &acc.provider).await {
                for item in items {
                    let full_path = if subpath.is_empty() {
                        item.name.clone()
                    } else {
                        format!("{}/{}", subpath.trim_matches('/'), item.name)
                    };

                    results.push(CachedFile {
                        id: Uuid::new_v4().to_string(),
                        account_id: acc.id.clone(),
                        remote_path: full_path,
                        parent_path: subpath.trim_matches('/').to_string(),
                        name: item.name,
                        is_dir: item.is_dir,
                        size: if item.size < 0 { 0 } else { item.size },
                        mime_type: if item.mime_type.is_empty() {
                            None
                        } else {
                            Some(item.mime_type)
                        },
                        mod_time: if item.mod_time.is_empty() {
                            None
                        } else {
                            Some(item.mod_time)
                        },
                        hash: None,
                        is_favorite: false,
                        is_trash: false,
                        last_accessed_at: None,
                        cached_at: now.clone(),
                    });
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn restore_file(
    account_id: String,
    remote_path: String,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<bool, String> {
    if let Ok(Some(account)) = db.accounts.get_by_id(&account_id) {
        if supports_native_trash(&account.provider) {
            let _ = rclone.untrash(&account.name, &remote_path).await;
        }
    }

    db.files
        .mark_trash(&account_id, &remote_path, false)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn empty_trash(
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<bool, String> {
    let trashed_files = db.files.get_trash().unwrap_or_default();
    let accounts = db.accounts.get_all().unwrap_or_default();

    // 1. Immediately delete from local SQLite so UI updates instantly
    db.files.empty_trash().map_err(|e| e.to_string())?;

    // 2. Perform remote cloud permanent deletions in background
    let rclone_clone = rclone.inner().clone();
    let accounts_clone = accounts.clone();
    tokio::spawn(async move {
        // Delete each trashed item on its cloud remote
        for file in trashed_files {
            if let Some(account) = accounts_clone.iter().find(|a| a.id == file.account_id) {
                if account.provider == "local" {
                    let target = resolve_account_local_path(account, &file.remote_path);
                    if file.is_dir {
                        let _ = std::fs::remove_dir_all(&target);
                    } else {
                        let _ = std::fs::remove_file(&target);
                    }
                } else {
                    if file.is_dir {
                        let _ = rclone_clone.purge_directory(&account.name, &file.remote_path).await;
                    } else {
                        let _ = rclone_clone.delete_file(&account.name, &file.remote_path).await;
                    }
                }
            }
        }

        // Also call rclone cleanup on Google Drive remotes to empty drive trash
        for account in accounts_clone {
            let p = account.provider.to_lowercase();
            if p == "drive" || p == "gdrive" || p.contains("google") {
                let _ = rclone_clone.cleanup_remote(&account.name).await;
            }
        }
    });

    Ok(true)
}

#[tauri::command]
pub async fn toggle_favorite(
    file_id: String,
    is_favorite: bool,
    db: State<'_, Database>,
) -> Result<bool, String> {
    db.files
        .toggle_favorite(&file_id, is_favorite)
        .map_err(|e| e.to_string())?;
    Ok(is_favorite)
}

#[tauri::command]
pub async fn create_folder(
    account_id: String,
    parent_path: String,
    folder_name: String,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<CachedFile, String> {
    let account = db
        .accounts
        .get_by_id(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account {} not found", account_id))?;

    let norm_parent = parent_path.trim_matches('/').to_string();
    let new_path = if norm_parent.is_empty() {
        folder_name.clone()
    } else {
        format!("{}/{}", norm_parent, folder_name)
    };

    if account.provider == "local" {
        let target_dir = resolve_account_local_path(&account, &new_path);
        std::fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Failed to create local directory {}: {}", target_dir.display(), e))?;
    } else {
        // Call live Rclone mkdir
        rclone
            .create_directory(&account.name, &new_path)
            .await
            .map_err(|e| e.to_string())?;
    }

    let now = chrono::Utc::now().to_rfc3339();
    let new_file = CachedFile {
        id: Uuid::new_v4().to_string(),
        account_id: account_id.clone(),
        remote_path: new_path,
        parent_path: norm_parent,
        name: folder_name,
        is_dir: true,
        size: 0,
        mime_type: Some("inode/directory".to_string()),
        mod_time: Some(now.clone()),
        hash: None,
        is_favorite: false,
        is_trash: false,
        last_accessed_at: Some(now.clone()),
        cached_at: now,
    };

    let _ = db.files.batch_upsert(&[new_file.clone()]);
    Ok(new_file)
}

#[tauri::command]
pub async fn delete_file(
    account_id: String,
    remote_path: String,
    is_dir: bool,
    permanent: Option<bool>,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<bool, String> {
    let is_perm = permanent.unwrap_or(false);
    let account = db
        .accounts
        .get_by_id(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account {} not found", account_id))?;

    if is_perm {
        if account.provider == "local" {
            let target = resolve_account_local_path(&account, &remote_path);
            if is_dir {
                std::fs::remove_dir_all(&target)
                    .map_err(|e| format!("Failed to remove local directory: {}", e))?;
            } else {
                std::fs::remove_file(&target)
                    .map_err(|e| format!("Failed to remove local file: {}", e))?;
            }
        } else {
            if is_dir {
                let _ = rclone.purge_directory(&account.name, &remote_path).await;
            } else {
                let _ = rclone.delete_file(&account.name, &remote_path).await;
            }
        }

        db.files
            .delete_by_path(&account_id, &remote_path)
            .map_err(|e| e.to_string())?;
    } else {
        // Soft delete: move to trash
        if supports_native_trash(&account.provider) {
            if is_dir {
                let _ = rclone.purge_directory_to_trash(&account.name, &remote_path).await;
            } else {
                let _ = rclone.delete_file_to_trash(&account.name, &remote_path).await;
            }
        }

        db.files
            .mark_trash(&account_id, &remote_path, true)
            .map_err(|e| e.to_string())?;
    }

    Ok(true)
}

#[tauri::command]
pub async fn rename_file(
    account_id: String,
    old_path: String,
    new_path: String,
    db: State<'_, Database>,
    rclone: State<'_, RcloneManager>,
) -> Result<bool, String> {
    let account = db
        .accounts
        .get_by_id(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account {} not found", account_id))?;

    if account.provider == "local" {
        let src = resolve_account_local_path(&account, &old_path);
        let dst = resolve_account_local_path(&account, &new_path);
        std::fs::rename(&src, &dst)
            .map_err(|e| format!("Failed to rename local file/folder: {}", e))?;
    } else {
        rclone
            .move_item(&account.name, &old_path, &account.name, &new_path)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Refresh DB cache
    db.files
        .delete_by_path(&account_id, &old_path)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn open_local_file(
    account_id: String,
    remote_path: String,
    db: State<'_, Database>,
) -> Result<bool, String> {
    let account = db
        .accounts
        .get_by_id(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account {} not found", account_id))?;

    if account.provider == "local" {
        let target = resolve_account_local_path(&account, &remote_path);
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("cmd")
                .args(["/c", "start", "", &target.to_string_lossy()])
                .spawn();
        }
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("open").arg(&target).spawn();
        }
        #[cfg(target_os = "linux")]
        {
            let _ = std::process::Command::new("xdg-open").arg(&target).spawn();
        }
        return Ok(true);
    }

    Ok(false)
}
