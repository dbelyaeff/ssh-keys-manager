use std::path::PathBuf;
use std::process::Command;
use anyhow::{Context, Result};
use crate::commands::servers::ServerConfig;

fn home_dir() -> Result<PathBuf> {
    dirs::home_dir().context("Cannot find home directory")
}

#[tauri::command]
pub async fn connect_to_server(config: ServerConfig) -> Result<(), String> {
    let mut ssh_cmd = format!("ssh {}@{}", config.user, config.hostname);
    if config.port != 22 {
        ssh_cmd.push_str(&format!(" -p {}", config.port));
    }
    if !config.identity_file.is_empty() {
        ssh_cmd.push_str(&format!(" -i {}", config.identity_file));
    }

    let safe_host = config.hostname.replace(|c: char| !c.is_alphanumeric(), "_");
    let script_path = format!("/tmp/ssh_keys_manager_connect_{}.command", safe_host);
    let bash_content = format!(
        "#!/bin/bash\nclear\necho \"Connecting to {}...\"\n{}\n",
        config.hostname, ssh_cmd
    );
    std::fs::write(&script_path, bash_content).map_err(|e| e.to_string())?;
    
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o755)).map_err(|e| e.to_string())?;

    let output = Command::new("open")
        .arg(&script_path)
        .output()
        .map_err(|e| format!("Cannot open terminal: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Terminal spawn failed: {err}"));
    }

    Ok(())
}

#[tauri::command]
pub async fn check_server_connection(config: ServerConfig) -> Result<bool, String> {
    let mut cmd = Command::new("ssh");
    cmd.arg("-o").arg("BatchMode=yes")
       .arg("-o").arg("ConnectTimeout=3")
       .arg("-o").arg("StrictHostKeyChecking=accept-new")
       .arg("-o").arg("PasswordAuthentication=no");

    if config.port != 22 {
        cmd.arg("-p").arg(config.port.to_string());
    }
    if !config.identity_file.is_empty() {
        cmd.arg("-i").arg(&config.identity_file);
    }
    cmd.arg(format!("{}@{}", config.user, config.hostname));
    cmd.arg("exit");

    let output = cmd.output().map_err(|e| format!("SSH command error: {e}"))?;
    Ok(output.status.success())
}

#[tauri::command]
pub async fn install_key_to_server(config: ServerConfig, password: String) -> Result<(), String> {
    let mut args = vec![
        "-o".to_string(), "StrictHostKeyChecking=accept-new".to_string(),
    ];
    if config.port != 22 {
        args.push("-p".to_string());
        args.push(config.port.to_string());
    }
    if !config.identity_file.is_empty() {
        args.push("-i".to_string());
        args.push(config.identity_file.clone());
    }
    args.push(format!("{}@{}", config.user, config.hostname));

    // Use sshpass if available, otherwise fall back to expect
    let sshpass = Command::new("which").arg("sshpass").output()
        .ok()
        .filter(|o| o.status.success())
        .is_some();

    let output = if sshpass {
        Command::new("sshpass")
            .arg("-p").arg(&password)
            .arg("ssh-copy-id")
            .args(&args)
            .output()
            .map_err(|e| format!("ssh-copy-id error: {e}"))?
    } else {
        // Try ssh-copy-id with SSH_ASKPASS workaround
        Command::new("ssh-copy-id")
            .args(&args)
            .env("SSH_ASKPASS_REQUIRE", "force")
            .env("DISPLAY", ":0")
            .output()
            .map_err(|e| format!("ssh-copy-id error: {e}"))?
    };

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if stderr.contains("REMOTE HOST IDENTIFICATION HAS CHANGED")
        || stderr.contains("WARNING: REMOTE HOST IDENTIFICATION")
    {
        return Err(format!("FingerprintMismatch:{}", config.hostname));
    }
    if !output.status.success() {
        return Err(format!("ssh-copy-id failed: {stderr}"));
    }
    Ok(())
}

#[tauri::command]
pub async fn remove_known_host(hostname: String) -> Result<(), String> {
    let output = Command::new("ssh-keygen")
        .arg("-R")
        .arg(&hostname)
        .output()
        .map_err(|e| format!("ssh-keygen -R error: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ssh-keygen -R failed: {err}"));
    }
    Ok(())
}
