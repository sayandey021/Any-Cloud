use std::path::PathBuf;

/// Platform-specific process creation flags.
/// On Windows, sets CREATE_NO_WINDOW (0x08000000) so no terminal or console window pops up.
#[cfg(windows)]
pub fn apply_platform_process_flags(cmd: &mut tokio::process::Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    cmd.as_std_mut().creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
pub fn apply_platform_process_flags(_cmd: &mut tokio::process::Command) {
    // No-op on Unix/macOS
}

/// Returns the standard default user data directory for Any Cloud on the current OS.
/// Safely falls back to local workspace directory if OS app data directory is not writable.
pub fn get_app_data_dir() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        let dir = PathBuf::from(app_data).join("AnyCloud");
        if std::fs::create_dir_all(&dir).is_ok() {
            return dir;
        }
    } else if let Ok(home) = std::env::var("HOME") {
        let dir = PathBuf::from(home).join(".config").join("anycloud");
        if std::fs::create_dir_all(&dir).is_ok() {
            return dir;
        }
    }

    let local = PathBuf::from("./anycloud_data");
    let _ = std::fs::create_dir_all(&local);
    local
}
