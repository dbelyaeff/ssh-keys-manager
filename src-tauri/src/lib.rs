mod commands;

use commands::keys::*;
use commands::servers::*;
use commands::connect::*;
use commands::archive::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            scan_ssh_keys,
            read_key_content,
            save_key,
            delete_key,
            generate_key,
            parse_ssh_config,
            save_server,
            delete_server,
            connect_to_server,
            install_key_to_server,
            remove_known_host,
            export_archive,
            import_archive,
            apply_import,
            check_server_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
