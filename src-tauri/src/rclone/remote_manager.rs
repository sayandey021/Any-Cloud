use std::path::PathBuf;
use std::sync::Arc;
use crate::platform::get_app_data_dir;
use crate::rclone::command_builder::RcloneCommandBuilder;
use crate::rclone::error_handler::RcloneResult;
use crate::rclone::output_parser::{parse_about_output, parse_remotes_output, RcloneAbout};
use crate::rclone::process_manager::ProcessManager;

pub struct RemoteManager {
    process_manager: Arc<ProcessManager>,
    command_builder: RcloneCommandBuilder,
    config_path: PathBuf,
}

impl RemoteManager {
    pub fn new(process_manager: Arc<ProcessManager>, config_path: Option<PathBuf>) -> Self {
        let cfg = config_path.unwrap_or_else(|| {
            let dir = get_app_data_dir();
            let _ = std::fs::create_dir_all(&dir);
            dir.join("rclone.conf")
        });

        Self {
            process_manager,
            command_builder: RcloneCommandBuilder::new(Some(cfg.clone())),
            config_path: cfg,
        }
    }

    pub fn config_path(&self) -> &PathBuf {
        &self.config_path
    }

    /// Lists all remotes configured in rclone.conf
    pub async fn list_remotes(&self) -> RcloneResult<Vec<String>> {
        let args = self.command_builder.list_remotes();
        let output = self.process_manager.execute(&args).await?;
        Ok(parse_remotes_output(&output.stdout))
    }

    /// Fetches storage quota for a specific remote
    pub async fn get_remote_quota(&self, remote_name: &str) -> RcloneResult<RcloneAbout> {
        let args = self.command_builder.about(remote_name);
        match self.process_manager.execute(&args).await {
            Ok(output) => parse_about_output(&output.stdout),
            Err(e) => {
                log::warn!("Failed to fetch quota for remote {}: {}", remote_name, e);
                // Not all providers support `about` (e.g. some WebDAV or S3 buckets without billing APIs)
                Ok(RcloneAbout::default())
            }
        }
    }

    /// Creates or updates a remote configuration in rclone.conf
    pub async fn create_remote(
        &self,
        name: &str,
        provider_type: &str,
        params: &[(&str, &str)],
    ) -> RcloneResult<()> {
        let args = self.command_builder.config_create(name, provider_type, params);
        self.process_manager.execute(&args).await?;
        Ok(())
    }

    /// Removes a remote configuration from rclone.conf
    pub async fn delete_remote(&self, name: &str) -> RcloneResult<()> {
        let args = self.command_builder.config_delete(name);
        self.process_manager.execute(&args).await?;
        Ok(())
    }
}
