// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            format!("{:#?}", info)
        };
        let location = info.location().map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column())).unwrap_or_default();
        let err_msg = format!("Any Cloud Panic: {}\nLocation: {}\n", msg, location);
        let _ = std::fs::write("anycloud_crash.log", &err_msg);
        eprintln!("{}", err_msg);
    }));

    any_cloud_lib::run();
}
