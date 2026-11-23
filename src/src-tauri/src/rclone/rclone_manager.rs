use std::path::{Path, PathBuf};
use std::sync::Arc;
use crate::platform::get_app_data_dir;
use crate::rclone::command_builder::RcloneCommandBuilder;
use crate::rclone::error_handler::RcloneResult;
use crate::rclone::output_parser::{
    parse_lsjson_output, parse_version_output, RcloneItem, RcloneVersionInfo,
};
use crate::rclone::process_manager::ProcessManager;
use crate::rclone::remote_manager::RemoteManager;
use crate::rclone::transfer_manager::TransferManager;

#[derive(Clone)]
pub struct RcloneManager {
    binary_path: PathBuf,
    process_manager: Arc<ProcessManager>,
    command_builder: RcloneCommandBuilder,
    pub remote_manager: Arc<RemoteManager>,
    pub transfer_manager: Arc<TransferManager>,
}

impl RcloneManager {
    /// Attempts to discover the Rclone binary:
    /// 1. Custom path override (if provided)
    /// 2. Application local bin directory (e.g. `%APPDATA%\AnyCloud\bin\rclone.exe`)
    /// 3. Alongside current executable (`./rclone.exe`)
    /// 4. System PATH (`rclone` or `rclone.exe`)
    pub fn discover_binary(custom_path: Option<&str>) -> PathBuf {
        if let Some(custom) = custom_path {
            let p = PathBuf::from(custom);
            if p.exists() {
                return p;
            }
        }

        let exe_name = if cfg!(windows) { "rclone.exe" } else { "rclone" };

        // 1. Next to current running executable or in its bin/ folder
        if let Ok(current) = std::env::current_exe() {
            if let Some(dir) = current.parent() {
                let candidate1 = dir.join(exe_name);
                if candidate1.exists() {
                    return candidate1;
                }
                let candidate2 = dir.join("bin").join(exe_name);
                if candidate2.exists() {
                    return candidate2;
                }
            }
        }

        // 2. Relative bin directory
        let local_bin = PathBuf::from("bin").join(exe_name);
        if local_bin.exists() {
            return local_bin;
        }

        let local_root = PathBuf::from(exe_name);
        if local_root.exists() {
            return local_root;
        }

        // 3. User app data bin
        let app_bin = get_app_data_dir().join("bin").join(exe_name);
        if app_bin.exists() {
            return app_bin;
        }

        // 4. Fallback to binary name in PATH
        PathBuf::from(exe_name)
    }

    pub fn new(custom_binary_path: Option<&str>, custom_config_path: Option<PathBuf>) -> Self {
        let binary_path = Self::discover_binary(custom_binary_path);
        let process_manager = Arc::new(ProcessManager::new(binary_path.clone()));

        let cfg = custom_config_path.unwrap_or_else(|| {
            let dir = get_app_data_dir();
            let _ = std::fs::create_dir_all(&dir);
            dir.join("rclone.conf")
        });

        let command_builder = RcloneCommandBuilder::new(Some(cfg.clone()));
        let remote_manager = Arc::new(RemoteManager::new(
            process_manager.clone(),
            Some(cfg.clone()),
        ));
        let transfer_manager = Arc::new(TransferManager::new(
            process_manager.clone(),
            command_builder.clone(),
        ));

        Self {
            binary_path,
            process_manager,
            command_builder,
            remote_manager,
            transfer_manager,
        }
    }

    pub fn binary_path(&self) -> &Path {
        &self.binary_path
    }

    /// Checks if Rclone binary is available and executable
    pub async fn check_availability(&self) -> RcloneResult<RcloneVersionInfo> {
        let args = self.command_builder.version();
        let output = self.process_manager.execute(&args).await?;
        parse_version_output(&output.stdout)
    }

    /// Lists files and directories at the specified cloud remote path
    pub async fn list_directory(
        &self,
        remote: &str,
        path: &str,
        recursive: bool,
    ) -> RcloneResult<Vec<RcloneItem>> {
        let args = self.command_builder.lsjson(remote, path, recursive);
        let output = self.process_manager.execute(&args).await?;
        parse_lsjson_output(&output.stdout)
    }

    /// Creates a directory at the remote path
    pub async fn create_directory(&self, remote: &str, path: &str) -> RcloneResult<()> {
        let args = self.command_builder.mkdir(remote, path);
        self.process_manager.execute(&args).await?;
        Ok(())
    }

    /// Deletes a single file at the remote path
    pub async fn delete_file(&self, remote: &str, path: &str) -> RcloneResult<()> {
        let args = self.command_builder.delete_file(remote, path);
        self.process_manager.execute(&args).await?;
        Ok(())
    }

    /// Purges an entire folder and its contents
    pub async fn purge_directory(&self, remote: &str, path: &str) -> RcloneResult<()> {
        let args = self.command_builder.purge(remote, path);
        self.process_manager.execute(&args).await?;
        Ok(())
    }

    /// Renames or moves a file or folder
    pub async fn move_item(
        &self,
        src_remote: &str,
        src_path: &str,
        dst_remote: &str,
        dst_path: &str,
    ) -> RcloneResult<()> {
        let args = self.command_builder.moveto(src_remote, src_path, dst_remote, dst_path);
        self.process_manager.execute(&args).await?;
        Ok(())
    }

    /// Authorizes a cloud remote via browser OAuth flow (`rclone authorize <backend>`)
    pub async fn authorize_cloud(&self, backend: &str) -> RcloneResult<String> {
        let template_path = std::env::temp_dir().join("anycloud_oauth_template.html");
        let html_content = r#"{{ if .OK }}<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Any Cloud — Connected</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      background-color: #09090b;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background-color: #121215;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 36px 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .icon-container {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background-color: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.25);
      color: #22c55e;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .icon-container svg {
      width: 24px;
      height: 24px;
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      color: #fafafa;
      margin-bottom: 8px;
      letter-spacing: -0.01em;
    }
    p {
      color: #a1a1aa;
      font-size: 13.5px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 40px;
      background-color: #fafafa;
      color: #09090b;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s ease;
      text-decoration: none;
    }
    .btn:hover {
      background-color: #e4e4e7;
    }
    .footer-note {
      margin-top: 16px;
      font-size: 11.5px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Account Connected</h1>
    <p>You have successfully authorized your account with <strong>Any Cloud</strong>. You can close this tab and return to the application.</p>
    <button class="btn" onclick="window.close()">Close tab</button>
    <div class="footer-note">Any Cloud Desktop File Manager</div>
  </div>
</body>
</html>
{{ else }}<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Any Cloud — Authentication Failed</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      background-color: #09090b;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background-color: #121215;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 36px 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .icon-container {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background-color: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .icon-container svg {
      width: 24px;
      height: 24px;
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      color: #fafafa;
      margin-bottom: 8px;
      letter-spacing: -0.01em;
    }
    p {
      color: #a1a1aa;
      font-size: 13.5px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .details {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12px;
      color: #f87171;
      margin-bottom: 20px;
      word-break: break-all;
      text-align: left;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 40px;
      background-color: #27272a;
      color: #fafafa;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid #3f3f46;
      cursor: pointer;
      transition: background-color 0.15s ease;
      text-decoration: none;
    }
    .btn:hover {
      background-color: #3f3f46;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-container">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
    <h1>Authentication Failed</h1>
    <p>Could not complete authorization. Please return to <strong>Any Cloud</strong> and try again.</p>
    {{ if .Description }}<div class="details">{{ .Description }}</div>{{ end }}
    <button class="btn" onclick="window.close()">Close tab</button>
  </div>
</body>
</html>
{{ end }}"#;

        let mut args = vec!["authorize".to_string(), backend.to_string()];
        if std::fs::write(&template_path, html_content).is_ok() {
            args.push("--template".to_string());
            args.push(template_path.to_string_lossy().to_string());
        }

        let output = self.process_manager.execute(&args).await?;
        
        // Extract JSON token between first '{' and last '}'
        if let Some(start) = output.stdout.find('{') {
            if let Some(end) = output.stdout.rfind('}') {
                if end > start {
                    return Ok(output.stdout[start..=end].to_string());
                }
            }
        }
        
        Ok(output.stdout.trim().to_string())
    }
}
