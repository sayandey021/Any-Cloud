use serde::{Deserialize, Serialize};
use crate::rclone::error_handler::{RcloneError, RcloneResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RcloneVersionInfo {
    pub version: String,
    #[serde(rename = "isGit", default)]
    pub is_git: bool,
    #[serde(default)]
    pub os: String,
    #[serde(default)]
    pub arch: String,
    #[serde(rename = "goVersion", default)]
    pub go_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RcloneItem {
    #[serde(rename = "Path")]
    pub path: String,
    #[serde(rename = "Name")]
    pub name: String,
    #[serde(rename = "Size")]
    pub size: i64,
    #[serde(rename = "MimeType", default)]
    pub mime_type: String,
    #[serde(rename = "ModTime", default)]
    pub mod_time: String,
    #[serde(rename = "IsDir", default)]
    pub is_dir: bool,
    #[serde(rename = "IsBucket", default)]
    pub is_bucket: bool,
    #[serde(rename = "ID", default)]
    pub id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RcloneAbout {
    #[serde(default)]
    pub total: Option<i64>,
    #[serde(default)]
    pub used: Option<i64>,
    #[serde(default)]
    pub free: Option<i64>,
    #[serde(default)]
    pub trashed: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RcloneTransferStats {
    #[serde(default)]
    pub bytes: i64,
    #[serde(rename = "totalBytes", default)]
    pub total_bytes: i64,
    #[serde(default)]
    pub speed: f64,
    #[serde(default)]
    pub eta: Option<i64>,
    #[serde(default)]
    pub checks: i64,
    #[serde(default)]
    pub transfers: i64,
    #[serde(default)]
    pub errors: i64,
    #[serde(rename = "transferring", default)]
    pub active_transfers: Vec<RcloneActiveTransfer>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RcloneActiveTransfer {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub size: i64,
    #[serde(default)]
    pub bytes: i64,
    #[serde(default)]
    pub speed: f64,
    #[serde(default)]
    pub percentage: f64,
    #[serde(default)]
    pub eta: Option<i64>,
}

/// Parses the output of `rclone version --output=json` or standard text output fallback
pub fn parse_version_output(output: &str) -> RcloneResult<RcloneVersionInfo> {
    let trimmed = output.trim();
    if trimmed.is_empty() {
        return Err(RcloneError::ParseError("Empty version output".into()));
    }

    // Try parsing as JSON first
    if let Ok(info) = serde_json::from_str::<RcloneVersionInfo>(trimmed) {
        return Ok(info);
    }

    // Fallback: parse plain text like "rclone v1.68.0"
    let first_line = trimmed.lines().next().unwrap_or(trimmed);
    let version = if let Some(v) = first_line.strip_prefix("rclone v") {
        v.split_whitespace().next().unwrap_or(v).to_string()
    } else if let Some(v) = first_line.strip_prefix("rclone ") {
        v.split_whitespace().next().unwrap_or(v).to_string()
    } else {
        first_line.to_string()
    };

    Ok(RcloneVersionInfo {
        version,
        is_git: false,
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        go_version: "unknown".to_string(),
    })
}

/// Parses the output of `rclone listremotes`
pub fn parse_remotes_output(output: &str) -> Vec<String> {
    output
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .map(|line| line.trim_end_matches(':').to_string())
        .collect()
}

/// Parses the output of `rclone lsjson`
pub fn parse_lsjson_output(output: &str) -> RcloneResult<Vec<RcloneItem>> {
    let trimmed = output.trim();
    if trimmed.is_empty() || trimmed == "[]" {
        return Ok(Vec::new());
    }

    serde_json::from_str::<Vec<RcloneItem>>(trimmed).map_err(|err| {
        RcloneError::ParseError(format!("Failed to parse rclone lsjson JSON: {}", err))
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleDriveQueryItem {
    pub id: Option<String>,
    pub name: String,
    #[serde(rename = "mimeType", default)]
    pub mime_type: String,
    #[serde(rename = "modifiedTime", default)]
    pub modified_time: String,
    #[serde(default)]
    pub size: Option<String>,
    #[serde(default)]
    pub trashed: Option<bool>,
}

/// Parses the output of `rclone backend query <remote>: "trashed = true"`
pub fn parse_drive_query_output(output: &str) -> RcloneResult<Vec<RcloneItem>> {
    let trimmed = output.trim();
    if trimmed.is_empty() || trimmed == "[]" {
        return Ok(Vec::new());
    }

    let json_start = trimmed.find('[').unwrap_or(0);
    let json_str = &trimmed[json_start..];

    let items: Vec<GoogleDriveQueryItem> = serde_json::from_str(json_str).map_err(|err| {
        RcloneError::ParseError(format!("Failed to parse drive query JSON: {}", err))
    })?;

    Ok(items
        .into_iter()
        .map(|item| {
            let is_dir = item.mime_type == "application/vnd.google-apps.folder";
            let size = item.size.and_then(|s| s.parse::<i64>().ok()).unwrap_or(0);
            RcloneItem {
                path: item.name.clone(),
                name: item.name,
                size,
                mime_type: item.mime_type,
                mod_time: item.modified_time,
                is_dir,
                is_bucket: false,
                id: item.id,
            }
        })
        .collect())
}

/// Parses the output of `rclone about <remote>: --json`
pub fn parse_about_output(output: &str) -> RcloneResult<RcloneAbout> {
    let trimmed = output.trim();
    if trimmed.is_empty() || trimmed == "{}" {
        return Ok(RcloneAbout::default());
    }

    serde_json::from_str::<RcloneAbout>(trimmed).map_err(|err| {
        RcloneError::ParseError(format!("Failed to parse rclone about JSON: {}", err))
    })
}

/// Parses a line of JSON log emitted during transfer `--use-json-log --stats=500ms`
pub fn parse_stats_json_line(line: &str) -> Option<RcloneTransferStats> {
    let trimmed = line.trim();
    if !trimmed.starts_with('{') || !trimmed.ends_with('}') {
        return None;
    }

    #[derive(Deserialize)]
    struct LogEntry {
        stats: Option<RcloneTransferStats>,
    }

    if let Ok(entry) = serde_json::from_str::<LogEntry>(trimmed) {
        if let Some(stats) = entry.stats {
            return Some(stats);
        }
    }

    // Direct stats object fallback
    serde_json::from_str::<RcloneTransferStats>(trimmed).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_version_json() {
        let json = r#"{"arch":"amd64","goVersion":"go1.22.4","isGit":false,"os":"windows","version":"v1.68.0"}"#;
        let info = parse_version_output(json).unwrap();
        assert_eq!(info.version, "v1.68.0");
        assert_eq!(info.os, "windows");
        assert_eq!(info.arch, "amd64");
    }

    #[test]
    fn test_parse_version_text() {
        let text = "rclone v1.67.0\n- os/version: Microsoft Windows 11 Pro\n";
        let info = parse_version_output(text).unwrap();
        assert_eq!(info.version, "1.67.0");
    }

    #[test]
    fn test_parse_remotes() {
        let output = "gdrive:\nonedrive:\ns3-backup:\n";
        let remotes = parse_remotes_output(output);
        assert_eq!(remotes, vec!["gdrive", "onedrive", "s3-backup"]);
    }

    #[test]
    fn test_parse_lsjson() {
        let json = r#"[
            {"Path":"Documents","Name":"Documents","Size":-1,"MimeType":"inode/directory","ModTime":"2026-10-01T12:00:00Z","IsDir":true,"IsBucket":false},
            {"Path":"photo.jpg","Name":"photo.jpg","Size":2048576,"MimeType":"image/jpeg","ModTime":"2026-10-05T14:30:00Z","IsDir":false,"IsBucket":false}
        ]"#;
        let items = parse_lsjson_output(json).unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].name, "Documents");
        assert!(items[0].is_dir);
        assert_eq!(items[1].name, "photo.jpg");
        assert_eq!(items[1].size, 2048576);
    }

    #[test]
    fn test_parse_about() {
        let json = r#"{"total":107374182400,"used":21474836480,"free":85899345920,"trashed":1048576}"#;
        let about = parse_about_output(json).unwrap();
        assert_eq!(about.total, Some(107374182400));
        assert_eq!(about.used, Some(21474836480));
        assert_eq!(about.free, Some(85899345920));
        assert_eq!(about.trashed, Some(1048576));
    }
}
