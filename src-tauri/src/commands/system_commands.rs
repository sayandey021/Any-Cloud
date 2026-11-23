use serde::{Deserialize, Serialize};
use tauri::State;
use crate::database::Database;
use crate::providers::{get_supported_providers, ProviderMetadata};

#[derive(Debug, Serialize, Deserialize)]
pub struct CloudStorageItem {
    pub account_id: String,
    pub account_name: String,
    pub provider: String,
    pub quota_total: i64,
    pub quota_used: i64,
    pub quota_free: i64,
    pub used_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageSummary {
    pub total_bytes: i64,
    pub used_bytes: i64,
    pub free_bytes: i64,
    pub overall_percentage: f64,
    pub total_accounts: usize,
    pub clouds: Vec<CloudStorageItem>,
}

#[tauri::command]
pub async fn get_storage_summary(db: State<'_, Database>) -> Result<StorageSummary, String> {
    let accounts = db.accounts.get_all().map_err(|e| e.to_string())?;

    let mut total_bytes: i64 = 0;
    let mut used_bytes: i64 = 0;
    let mut free_bytes: i64 = 0;
    let mut clouds = Vec::new();

    for acc in &accounts {
        let q_tot = acc.quota_total.unwrap_or(0);
        let q_use = acc.quota_used.unwrap_or(0);
        let q_fre = acc.quota_free.unwrap_or(if q_tot > q_use { q_tot - q_use } else { 0 });

        if q_tot > 0 {
            total_bytes += q_tot;
            used_bytes += q_use;
            free_bytes += q_fre;
        }

        let used_pct = if q_tot > 0 {
            (q_use as f64 / q_tot as f64 * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };

        clouds.push(CloudStorageItem {
            account_id: acc.id.clone(),
            account_name: acc.label.clone().unwrap_or_else(|| acc.name.clone()),
            provider: acc.provider.clone(),
            quota_total: q_tot,
            quota_used: q_use,
            quota_free: q_fre,
            used_percentage: used_pct,
        });
    }

    let overall_percentage = if total_bytes > 0 {
        (used_bytes as f64 / total_bytes as f64 * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    Ok(StorageSummary {
        total_bytes,
        used_bytes,
        free_bytes,
        overall_percentage,
        total_accounts: accounts.len(),
        clouds,
    })
}

#[tauri::command]
pub async fn get_supported_providers_list() -> Result<Vec<ProviderMetadata>, String> {
    Ok(get_supported_providers())
}

#[tauri::command]
pub async fn get_default_local_path() -> Result<String, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| "C:\\".to_string());
    let downloads = std::path::Path::new(&home).join("Downloads");
    if downloads.exists() {
        return Ok(downloads.to_string_lossy().to_string());
    }
    let docs = std::path::Path::new(&home).join("Documents");
    if docs.exists() {
        Ok(docs.to_string_lossy().to_string())
    } else {
        Ok(home)
    }
}

#[tauri::command]
pub async fn pick_folder(initial_path: Option<String>) -> Result<Option<String>, String> {
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            let initial = initial_path.unwrap_or_default().replace('\'', "''");
            let script = format!(
                r#"
                Add-Type -AssemblyName System.Windows.Forms
                $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
                $dialog.Description = 'Select Storage Folder'
                $dialog.ShowNewFolderButton = $true
                $init = '{initial}'
                if ($init -ne '' -and (Test-Path $init)) {{
                    $dialog.SelectedPath = $init
                }}
                $form = New-Object System.Windows.Forms.Form
                $form.TopMost = $true
                $res = $dialog.ShowDialog($form)
                if ($res -eq [System.Windows.Forms.DialogResult]::OK) {{
                    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                    [Console]::WriteLine($dialog.SelectedPath)
                }}
                $form.Dispose()
                "#
            );

            #[cfg(windows)]
            use std::os::windows::process::CommandExt;
            #[cfg(windows)]
            const CREATE_NO_WINDOW: u32 = 0x08000000;

            let mut cmd = Command::new("powershell");
            cmd.args(["-NoProfile", "-NonInteractive", "-Command", &script]);
            #[cfg(windows)]
            cmd.creation_flags(CREATE_NO_WINDOW);

            let output = cmd.output().map_err(|e| format!("Failed to open folder picker: {}", e))?;
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if stdout.is_empty() {
                Ok(None)
            } else {
                Ok(Some(stdout))
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(None)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn pick_files(
    multiple: Option<bool>,
    initial_path: Option<String>,
) -> Result<Vec<String>, String> {
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            let is_multi = multiple.unwrap_or(true);
            let multi_flag = if is_multi { "$true" } else { "$false" };
            let initial = initial_path.unwrap_or_default().replace('\'', "''");
            let script = format!(
                r#"
                Add-Type -AssemblyName System.Windows.Forms
                $dialog = New-Object System.Windows.Forms.OpenFileDialog
                $dialog.Title = 'Select Files to Upload'
                $dialog.Multiselect = {multi_flag}
                $dialog.Filter = 'All Files (*.*)|*.*'
                $init = '{initial}'
                if ($init -ne '' -and (Test-Path $init)) {{
                    $dialog.InitialDirectory = $init
                }}
                $form = New-Object System.Windows.Forms.Form
                $form.TopMost = $true
                $res = $dialog.ShowDialog($form)
                if ($res -eq [System.Windows.Forms.DialogResult]::OK) {{
                    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                    foreach ($file in $dialog.FileNames) {{
                        [Console]::WriteLine($file)
                    }}
                }}
                $form.Dispose()
                "#
            );

            #[cfg(windows)]
            use std::os::windows::process::CommandExt;
            #[cfg(windows)]
            const CREATE_NO_WINDOW: u32 = 0x08000000;

            let mut cmd = Command::new("powershell");
            cmd.args(["-NoProfile", "-NonInteractive", "-Command", &script]);
            #[cfg(windows)]
            cmd.creation_flags(CREATE_NO_WINDOW);

            let output = cmd.output().map_err(|e| format!("Failed to open file picker: {}", e))?;
            let stdout = String::from_utf8_lossy(&output.stdout);
            let files: Vec<String> = stdout
                .lines()
                .map(|l| l.trim().to_string())
                .filter(|l| !l.is_empty())
                .collect();
            Ok(files)
        }
        #[cfg(not(target_os = "windows"))]
        {
            Ok(Vec::new())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheStats {
    pub cached_files_count: usize,
    pub cached_bytes: i64,
}

#[tauri::command]
pub async fn get_cache_stats(db: State<'_, Database>) -> Result<CacheStats, String> {
    let (count, bytes) = db.files.get_cache_stats().map_err(|e| e.to_string())?;
    Ok(CacheStats {
        cached_files_count: count,
        cached_bytes: bytes,
    })
}

#[tauri::command]
pub async fn clear_cache(db: State<'_, Database>) -> Result<usize, String> {
    db.files.clear_all_cache().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_local_directory(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        Ok(())
    }
}

#[tauri::command]
pub async fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map_err(|e| format!("Failed to open browser URL: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = url;
        Ok(())
    }
}
