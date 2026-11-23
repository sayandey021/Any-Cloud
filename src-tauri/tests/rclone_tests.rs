use any_cloud_lib::rclone::command_builder::RcloneCommandBuilder;
use any_cloud_lib::rclone::output_parser::{
    parse_about_output, parse_lsjson_output, parse_remotes_output, parse_stats_json_line,
    parse_version_output,
};
use std::path::PathBuf;

#[test]
fn test_command_builder_safety() {
    let builder = RcloneCommandBuilder::new(Some(PathBuf::from("C:/test/rclone.conf")));

    let args = builder.lsjson("my_drive", "/nested/folder/path", false);
    assert_eq!(args[0], "--config");
    assert_eq!(args[1], "C:/test/rclone.conf");
    assert_eq!(args[2], "lsjson");
    assert_eq!(args[3], "my_drive:nested/folder/path");
    assert_eq!(args[4], "--fast-list");

    let copy_args = builder.copy_file_with_stats("gdrive", "file.pdf", "onedrive", "backup/file.pdf");
    assert!(copy_args.contains(&"--use-json-log".to_string()));
    assert!(copy_args.contains(&"--stats".to_string()));
    assert!(copy_args.contains(&"500ms".to_string()));
}

#[test]
fn test_parse_rclone_version_variations() {
    // Standard json format
    let json_sample = r#"{"arch":"amd64","goVersion":"go1.22.4","isGit":false,"os":"windows","version":"v1.68.0"}"#;
    let info = parse_version_output(json_sample).expect("Failed to parse version JSON");
    assert_eq!(info.version, "v1.68.0");
    assert_eq!(info.os, "windows");

    // Plain text format
    let text_sample = "rclone v1.68.2\n- os/version: Microsoft Windows 11\n";
    let info_text = parse_version_output(text_sample).expect("Failed to parse text version");
    assert_eq!(info_text.version, "1.68.2");
}

#[test]
fn test_parse_rclone_lsjson() {
    let raw = r#"[
        {"Path":"Photos","Name":"Photos","Size":-1,"MimeType":"inode/directory","ModTime":"2026-11-01T10:00:00Z","IsDir":true,"IsBucket":false},
        {"Path":"Document.pdf","Name":"Document.pdf","Size":1048576,"MimeType":"application/pdf","ModTime":"2026-11-02T12:00:00Z","IsDir":false,"IsBucket":false}
    ]"#;

    let items = parse_lsjson_output(raw).expect("Failed to parse items");
    assert_eq!(items.len(), 2);
    assert_eq!(items[0].name, "Photos");
    assert!(items[0].is_dir);
    assert_eq!(items[1].name, "Document.pdf");
    assert_eq!(items[1].size, 1048576);
}

#[test]
fn test_parse_streaming_progress() {
    let log_line = r#"{"level":"info","msg":null,"source":"accounting/accounting.go:420","stats":{"bytes":52428800,"checks":0,"deletes":0,"elapsedTime":2.5,"errors":0,"eta":5,"fatalError":false,"retryError":false,"speed":20971520,"totalBytes":104857600,"totalChecks":0,"totalTransfers":1,"transferTime":2.5,"transfers":0,"transferring":[{"bytes":52428800,"eta":5,"group":"main","name":"archive.tar.gz","percentage":50,"size":104857600,"speed":20971520,"speedAvg":20971520}]},"time":"2026-11-18T00:00:00.000000+00:00"}"#;

    let stats = parse_stats_json_line(log_line).expect("Failed to parse stats JSON");
    assert_eq!(stats.bytes, 52428800);
    assert_eq!(stats.total_bytes, 104857600);
    assert_eq!(stats.eta, Some(5));
    assert_eq!(stats.speed, 20971520.0);
    assert_eq!(stats.active_transfers.len(), 1);
    assert_eq!(stats.active_transfers[0].name, "archive.tar.gz");
}
