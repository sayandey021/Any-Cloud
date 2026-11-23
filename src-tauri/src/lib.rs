pub mod commands;
pub mod database;
pub mod events;
pub mod oauth;
pub mod platform;
pub mod providers;
pub mod rclone;
pub mod security;
pub mod transfers;

use database::Database;
use rclone::RcloneManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Database::init(None).expect("Failed to initialize Any Cloud SQLite database");
    let rclone = RcloneManager::new(None, None);

    let app = tauri::Builder::default()
        .manage(db)
        .manage(rclone)
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let icon = tauri::include_image!("icons/icon.png");
                if let Err(e) = window.set_icon(icon) {
                    eprintln!("Failed to set window icon: {:?}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Rclone & Status
            commands::check_rclone_status,
            commands::list_configured_remotes,
            commands::get_remote_quota,
            // Accounts
            commands::get_accounts,
            commands::add_account,
            commands::remove_account,
            commands::sync_account_metadata,
            commands::authorize_oauth_cloud,
            commands::cancel_oauth,
            // Files
            commands::list_files,
            commands::search_files,
            commands::get_recent_files,
            commands::get_favorite_files,
            commands::get_trash_files,
            commands::get_shared_files,
            commands::restore_file,
            commands::empty_trash,
            commands::toggle_favorite,
            commands::create_folder,
            commands::delete_file,
            commands::rename_file,
            commands::open_local_file,
            // Transfers
            commands::start_transfer,
            commands::cancel_transfer,
            commands::get_transfers,
            commands::clear_transfer_history,
            // System
            commands::get_storage_summary,
            commands::get_supported_providers_list,
            commands::get_default_local_path,
            commands::pick_folder,
            commands::pick_files,
            commands::get_cache_stats,
            commands::clear_cache,
            commands::open_local_directory,
            commands::open_external_url,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = app {
        let _ = std::fs::write("anycloud_crash.log", format!("Tauri Run Error: {:#?}", e));
    }
}
