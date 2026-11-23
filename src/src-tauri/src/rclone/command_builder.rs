use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct RcloneCommandBuilder {
    config_path: Option<PathBuf>,
}

impl RcloneCommandBuilder {
    pub fn new(config_path: Option<PathBuf>) -> Self {
        Self { config_path }
    }

    fn base_args(&self) -> Vec<String> {
        let mut args = Vec::new();
        if let Some(ref cfg) = self.config_path {
            args.push("--config".to_string());
            args.push(cfg.to_string_lossy().to_string());
        }
        args
    }

    /// `rclone version --output=json`
    pub fn version(&self) -> Vec<String> {
        vec!["version".to_string(), "--output=json".to_string()]
    }

    /// `rclone listremotes`
    pub fn list_remotes(&self) -> Vec<String> {
        let mut args = self.base_args();
        args.push("listremotes".to_string());
        args
    }

    /// `rclone lsjson <remote>:<path> [--recursive] [--fast-list]`
    pub fn lsjson(&self, remote: &str, path: &str, recursive: bool) -> Vec<String> {
        let mut args = self.base_args();
        args.push("lsjson".to_string());
        
        let target = if path.is_empty() || path == "/" {
            format!("{}:", remote.trim_end_matches(':'))
        } else {
            format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'))
        };
        args.push(target);

        if recursive {
            args.push("--recursive".to_string());
        }
        args.push("--fast-list".to_string());
        args
    }

    /// `rclone about <remote>: --json`
    pub fn about(&self, remote: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("about".to_string());
        args.push(format!("{}:", remote.trim_end_matches(':')));
        args.push("--json".to_string());
        args
    }

    /// `rclone mkdir <remote>:<path>`
    pub fn mkdir(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("mkdir".to_string());
        let target = format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'));
        args.push(target);
        args
    }

    /// `rclone deletefile <remote>:<path>`
    pub fn delete_file(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("deletefile".to_string());
        let target = format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'));
        args.push(target);
        args
    }

    /// `rclone purge <remote>:<path>` (removes folder and all contents)
    pub fn purge(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("purge".to_string());
        let target = format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'));
        args.push(target);
        args
    }

    /// `rclone moveto <src> <dst>` (renames or moves single item)
    pub fn moveto(&self, src_remote: &str, src_path: &str, dst_remote: &str, dst_path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("moveto".to_string());
        let src = format!("{}:{}", src_remote.trim_end_matches(':'), src_path.trim_start_matches('/'));
        let dst = format!("{}:{}", dst_remote.trim_end_matches(':'), dst_path.trim_start_matches('/'));
        args.push(src);
        args.push(dst);
        args
    }

    /// `rclone copyto / copy` with progress streaming options
    pub fn copy_file_with_stats(
        &self,
        src_remote: &str,
        src_path: &str,
        dst_remote: &str,
        dst_path: &str,
    ) -> Vec<String> {
        let mut args = self.base_args();
        args.push("copyto".to_string());
        let src = format!("{}:{}", src_remote.trim_end_matches(':'), src_path.trim_start_matches('/'));
        let dst = format!("{}:{}", dst_remote.trim_end_matches(':'), dst_path.trim_start_matches('/'));
        args.push(src);
        args.push(dst);
        args.push("--use-json-log".to_string());
        args.push("--stats".to_string());
        args.push("500ms".to_string());
        args.push("--stats-log-level".to_string());
        args.push("INFO".to_string());
        args
    }

    /// `rclone config dump`
    pub fn config_dump(&self) -> Vec<String> {
        let mut args = self.base_args();
        args.push("config".to_string());
        args.push("dump".to_string());
        args
    }

    /// `rclone config delete <remote>`
    pub fn config_delete(&self, remote: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("config".to_string());
        args.push("delete".to_string());
        args.push(remote.trim_end_matches(':').to_string());
        args
    }

    /// `rclone config create <name> <type> [key value ...]`
    pub fn config_create(
        &self,
        name: &str,
        provider_type: &str,
        parameters: &[(&str, &str)],
    ) -> Vec<String> {
        let mut args = self.base_args();
        args.push("config".to_string());
        args.push("create".to_string());
        args.push(name.trim_end_matches(':').to_string());
        args.push(provider_type.to_string());
        for (k, v) in parameters {
            args.push(k.to_string());
            args.push(v.to_string());
        }
        args
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builder_args() {
        let builder = RcloneCommandBuilder::new(Some(PathBuf::from("/etc/rclone.conf")));
        let ls = builder.lsjson("myremote", "documents/notes.txt", false);
        assert_eq!(ls, vec![
            "--config", "/etc/rclone.conf",
            "lsjson", "myremote:documents/notes.txt",
            "--fast-list"
        ]);
    }
}
