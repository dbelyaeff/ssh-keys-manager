mod commands;

use commands::keys::*;
use commands::servers::*;
use commands::connect::*;
use commands::archive::*;
use commands::peer::*;
use commands::wsl::*;
use tauri::command;

#[command]
fn is_windows() -> bool {
    cfg!(windows)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(PeerState::new())
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
            check_server_connection,
            check_installed_terminals,
            export_archive,
            import_archive,
            apply_import,
            start_peer_service,
            discover_peers,
            get_peers,
            initiate_transfer,
            get_incoming_transfers,
            respond_to_transfer,
            send_peer_data,
            apply_received_data,
            stop_peer_service,
            get_wsl_distros,
            sync_to_wsl,
            is_windows,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
