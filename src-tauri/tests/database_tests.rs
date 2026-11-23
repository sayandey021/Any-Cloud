use any_cloud_lib::database::{CachedFile, CloudAccount, Database};

#[test]
fn test_database_crud_and_search() {
    let temp_dir = std::env::temp_dir().join(format!("anycloud_test_{}", uuid::Uuid::new_v4()));
    let _ = std::fs::create_dir_all(&temp_dir);
    let db_path = temp_dir.join("test.db");

    let db = Database::init(Some(db_path)).expect("Failed to initialize test SQLite DB");

    // 1. Insert Account
    let acc = CloudAccount {
        id: "acc_test_1".to_string(),
        provider: "gdrive".to_string(),
        name: "TestDrive".to_string(),
        label: Some("My Personal Drive".to_string()),
        status: "connected".to_string(),
        quota_total: Some(107374182400),
        quota_used: Some(21474836480),
        quota_free: Some(85899345920),
        last_synced_at: None,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    db.accounts.upsert(&acc).expect("Failed to insert account");

    let accounts = db.accounts.get_all().expect("Failed to get accounts");
    assert_eq!(accounts.len(), 1);
    assert_eq!(accounts[0].name, "TestDrive");

    // 2. Insert Files
    let now = chrono::Utc::now().to_rfc3339();
    let file1 = CachedFile {
        id: "f1".to_string(),
        account_id: "acc_test_1".to_string(),
        remote_path: "Reports/Q3.pdf".to_string(),
        parent_path: "Reports".to_string(),
        name: "Q3.pdf".to_string(),
        is_dir: false,
        size: 204800,
        mime_type: Some("application/pdf".to_string()),
        mod_time: Some(now.clone()),
        hash: None,
        is_favorite: true,
        is_trash: false,
        last_accessed_at: Some(now.clone()),
        cached_at: now.clone(),
    };

    let file2 = CachedFile {
        id: "f2".to_string(),
        account_id: "acc_test_1".to_string(),
        remote_path: "Reports/Invoice.xlsx".to_string(),
        parent_path: "Reports".to_string(),
        name: "Invoice.xlsx".to_string(),
        is_dir: false,
        size: 51200,
        mime_type: Some("application/vnd.ms-excel".to_string()),
        mod_time: Some(now.clone()),
        hash: None,
        is_favorite: false,
        is_trash: false,
        last_accessed_at: None,
        cached_at: now.clone(),
    };

    db.files
        .batch_upsert(&[file1.clone(), file2.clone()])
        .expect("Failed to batch upsert files");

    // 3. Query directory by parent
    let files_in_reports = db
        .files
        .get_by_parent("acc_test_1", "Reports")
        .expect("Failed to get files by parent");
    assert_eq!(files_in_reports.len(), 2);

    // 4. Query favorites
    let favs = db.files.get_favorites().expect("Failed to get favorites");
    assert_eq!(favs.len(), 1);
    assert_eq!(favs[0].name, "Q3.pdf");

    // 5. Search
    let search_results = db
        .files
        .search_files("Invoice", None)
        .expect("Failed to search files");
    assert_eq!(search_results.len(), 1);
    assert_eq!(search_results[0].name, "Invoice.xlsx");

    // Cleanup
    let _ = std::fs::remove_dir_all(temp_dir);
}
