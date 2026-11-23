use std::path::PathBuf;

fn format_target(remote: &str, path: &str) -> String {
    let r = remote.trim().trim_end_matches(':');
    let p = path.trim();

    if r.is_empty() || r.eq_ignore_ascii_case("local") || r.eq_ignore_ascii_case("Local Computer") {
        return p.to_string();
    }

    let is_windows_drive = p.len() >= 2 && p.as_bytes()[1] == b':' && p.as_bytes()[0].is_ascii_alphabetic();
    if is_windows_drive {
        return p.to_string();
    }

    if p.is_empty() || p == "/" {
        format!("{}:", r)
    } else {
        format!("{}:{}", r, p.trim_start_matches('/'))
    }
}

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

        // Performance & responsiveness tuning to eliminate hangs on remote requests
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=15s".to_string());
        args.push("--low-level-retries=2".to_string());

        if recursive {
            args.push("--recursive".to_string());
            args.push("--fast-list".to_string());
        }
        args
    }

    /// `rclone lsjson <remote>:<path> --drive-shared-with-me` / `--onedrive-shared-with-me`
    pub fn lsjson_shared(&self, remote: &str, path: &str, provider: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("lsjson".to_string());

        let target = if path.is_empty() || path == "/" {
            format!("{}:", remote.trim_end_matches(':'))
        } else {
            format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'))
        };
        args.push(target);

        args.push("--contimeout=5s".to_string());
        args.push("--timeout=15s".to_string());
        args.push("--low-level-retries=2".to_string());

        let p = provider.to_lowercase();
        if p == "drive" || p == "gdrive" || p.contains("google") {
            args.push("--drive-shared-with-me".to_string());
        } else if p == "onedrive" {
            args.push("--onedrive-shared-with-me".to_string());
        }

        args
    }

    /// `rclone lsjson <remote>:<path> --drive-trashed-only --recursive --files-only` / `--jottacloud-trashed-only`
    pub fn lsjson_trashed(&self, remote: &str, path: &str, provider: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("lsjson".to_string());

        let target = if path.is_empty() || path == "/" {
            format!("{}:", remote.trim_end_matches(':'))
        } else {
            format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'))
        };
        args.push(target);

        args.push("--contimeout=5s".to_string());
        args.push("--timeout=20s".to_string());
        args.push("--retries=1".to_string());
        args.push("--low-level-retries=2".to_string());
        args.push("--recursive".to_string());
        args.push("--files-only".to_string());

        let p = provider.to_lowercase();
        if p == "drive" || p == "gdrive" || p.contains("google") {
            args.push("--drive-trashed-only".to_string());
        } else if p == "jottacloud" {
            args.push("--jottacloud-trashed-only".to_string());
        }

        args
    }

    /// `rclone backend query <remote>: <query>`
    pub fn drive_query(&self, remote: &str, query: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("backend".to_string());
        args.push("query".to_string());
        args.push(format!("{}:", remote.trim_end_matches(':')));
        args.push(query.to_string());
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=20s".to_string());
        args.push("--retries=1".to_string());
        args.push("--low-level-retries=2".to_string());
        args
    }

    /// `rclone backend untrash <remote>:<path>` (restores trashed items on Google Drive)
    pub fn backend_untrash(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("backend".to_string());
        args.push("untrash".to_string());
        let target = if path.is_empty() || path == "/" {
            format!("{}:", remote.trim_end_matches(':'))
        } else {
            format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'))
        };
        args.push(target);
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=15s".to_string());
        args.push("--low-level-retries=2".to_string());
        args
    }

    /// `rclone deletefile <remote>:<path> --drive-use-trash=true` (moves file to native trash)
    pub fn delete_file_to_trash(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("deletefile".to_string());
        let target = format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'));
        args.push(target);
        args.push("--drive-use-trash=true".to_string());
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=15s".to_string());
        args.push("--low-level-retries=2".to_string());
        args
    }

    /// `rclone purge <remote>:<path> --drive-use-trash=true` (moves folder to native trash)
    pub fn purge_to_trash(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("purge".to_string());
        let target = format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'));
        args.push(target);
        args.push("--drive-use-trash=true".to_string());
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=15s".to_string());
        args.push("--low-level-retries=2".to_string());
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

    /// `rclone deletefile <remote>:<path> --drive-use-trash=false`
    pub fn delete_file(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("deletefile".to_string());
        let target = format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'));
        args.push(target);
        args.push("--drive-use-trash=false".to_string());
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=15s".to_string());
        args.push("--low-level-retries=2".to_string());
        args
    }

    /// `rclone purge <remote>:<path> --drive-use-trash=false` (removes folder and all contents)
    pub fn purge(&self, remote: &str, path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("purge".to_string());
        let target = format!("{}:{}", remote.trim_end_matches(':'), path.trim_start_matches('/'));
        args.push(target);
        args.push("--drive-use-trash=false".to_string());
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=15s".to_string());
        args.push("--low-level-retries=2".to_string());
        args
    }

    /// `rclone cleanup <remote>:` (empties native trash on cloud remotes like Google Drive)
    pub fn cleanup(&self, remote: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("cleanup".to_string());
        args.push(format!("{}:", remote.trim_end_matches(':')));
        args.push("--contimeout=5s".to_string());
        args.push("--timeout=20s".to_string());
        args.push("--low-level-retries=2".to_string());
        args
    }

    /// `rclone moveto <src> <dst>` (renames or moves single item)
    pub fn moveto(&self, src_remote: &str, src_path: &str, dst_remote: &str, dst_path: &str) -> Vec<String> {
        let mut args = self.base_args();
        args.push("moveto".to_string());
        let src = format_target(src_remote, src_path);
        let dst = format_target(dst_remote, dst_path);
        args.push(src);
        args.push(dst);
        args
    }

    /// `rclone copyto / copy` with progress streaming options and performance tuning
    pub fn copy_file_with_stats(
        &self,
        src_remote: &str,
        src_path: &str,
        dst_remote: &str,
        dst_path: &str,
        concurrent_transfers: Option<u32>,
        chunk_size_mb: Option<u32>,
        bandwidth_limit: Option<&str>,
        verify_checksum: Option<bool>,
        max_retries: Option<u32>,
    ) -> Vec<String> {
        let mut args = self.base_args();
        args.push("copyto".to_string());
        let src = format_target(src_remote, src_path);
        let dst = format_target(dst_remote, dst_path);
        args.push(src);
        args.push(dst);
        args.push("--use-json-log".to_string());
        args.push("--stats".to_string());
        args.push("500ms".to_string());
        args.push("--stats-log-level".to_string());
        args.push("INFO".to_string());

        if let Some(t) = concurrent_transfers {
            if t > 0 {
                args.push("--transfers".to_string());
                args.push(t.to_string());
            }
        }
        if let Some(chunk) = chunk_size_mb {
            if chunk > 0 {
                args.push(format!("--s3-chunk-size={}M", chunk));
                args.push(format!("--drive-chunk-size={}M", chunk));
            }
        }
        if let Some(limit) = bandwidth_limit {
            if limit != "0" && !limit.is_empty() {
                args.push("--bwlimit".to_string());
                args.push(limit.to_string());
            }
        }
        if verify_checksum == Some(true) {
            args.push("--checksum".to_string());
        }
        if let Some(retries) = max_retries {
            if retries > 0 {
                args.push("--retries".to_string());
                args.push(retries.to_string());
            }
        }

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
        args.push("--non-interactive".to_string());
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
            "--contimeout=5s", "--timeout=15s", "--low-level-retries=2"
        ]);
        let ls_rec = builder.lsjson("myremote", "documents/notes.txt", true);
        assert_eq!(ls_rec, vec![
            "--config", "/etc/rclone.conf",
            "lsjson", "myremote:documents/notes.txt",
            "--contimeout=5s", "--timeout=15s", "--low-level-retries=2",
            "--recursive",
            "--fast-list"
        ]);
    }
}
