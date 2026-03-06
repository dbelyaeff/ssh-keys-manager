use std::path::PathBuf;
use std::process::Command;
use anyhow::{Context, Result};
use crate::commands::servers::ServerConfig;

fn home_dir() -> Result<PathBuf> {
    dirs::home_dir().context("Cannot find home directory")
}

#[tauri::command]
pub async fn check_installed_terminals() -> Result<Vec<String>, String> {
    let mut terminals = vec!["Terminal.app".to_string()];
    
    if std::path::Path::new("/Applications/iTerm.app").exists() || std::path::Path::new("/Applications/iTerm2.app").exists() {
        terminals.push("iTerm.app".to_string());
    }
    
    if std::path::Path::new("/Applications/Warp.app").exists() {
        terminals.push("Warp.app".to_string());
    }
    
    Ok(terminals)
}

#[tauri::command]
pub async fn connect_to_server(config: ServerConfig, terminal: String) -> Result<(), String> {
    let mut ssh_cmd = format!("ssh {}@{}", config.user, config.hostname);
    if config.port != 22 {
        ssh_cmd.push_str(&format!(" -p {}", config.port));
    }
    if !config.identity_file.is_empty() {
        let id_file = if config.identity_file.starts_with("~/") {
            if let Ok(home) = home_dir() {
                home.join(config.identity_file.strip_prefix("~/").unwrap()).to_string_lossy().to_string()
            } else {
                config.identity_file.clone()
            }
        } else {
            config.identity_file.clone()
        };
        ssh_cmd.push_str(&format!(" -i {}", id_file));
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

    let mut open_cmd = Command::new("open");
    if terminal == "Terminal.app" {
        open_cmd.arg("-a").arg("Terminal");
    } else if terminal == "iTerm.app" {
        open_cmd.arg("-a").arg("iTerm");
    } else if terminal == "Warp.app" {
        open_cmd.arg("-a").arg("Warp");
    }
    
    let output = open_cmd
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
        let id_file = if config.identity_file.starts_with("~/") {
            if let Ok(home) = home_dir() {
                home.join(config.identity_file.strip_prefix("~/").unwrap()).to_string_lossy().to_string()
            } else {
                config.identity_file.clone()
            }
        } else {
            config.identity_file.clone()
        };
        cmd.arg("-i").arg(&id_file);
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
        let id_file = if config.identity_file.starts_with("~/") {
            if let Ok(home) = home_dir() {
                home.join(config.identity_file.strip_prefix("~/").unwrap()).to_string_lossy().to_string()
            } else {
                config.identity_file.clone()
            }
        } else {
            config.identity_file.clone()
        };
        
        // Ensure .pub file exists for ssh-copy-id
        let pub_file = format!("{}.pub", id_file);
        let pub_path = std::path::Path::new(&pub_file);
        if !pub_path.exists() {
            if let Ok(out) = Command::new("ssh-keygen").args(["-y", "-f", &id_file]).output() {
                if out.status.success() {
                    let mut content = String::from_utf8_lossy(&out.stdout).to_string();
                    if !content.ends_with('\n') {
                        content.push('\n');
                    }
                    let _ = std::fs::write(&pub_file, content);
                }
            }
        }

        args.push("-i".to_string());
        args.push(id_file);
    }
    args.push(format!("{}@{}", config.user, config.hostname));

    // Use sshpass if available, otherwise fall back to ssh-copy-id with expect script
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
        // Use expect script to automate password entry
        // Escape special characters in password for expect
        let escaped_password = password.replace("\\", "\\\\").replace("\"", "\\\"").replace("$", "\\$");
        let args_str = args.iter().map(|s| format!("\"{}\"", s.replace("\"", "\\\""))).collect::<Vec<_>>().join(" ");
        
        let expect_script = format!(
            r#"#!/usr/bin/expect -f
set timeout 30
spawn ssh-copy-id {}
expect {{
    "yes/no" {{
        send "yes\r"
        exp_continue
    }}
    "password:" {{
        send "{}\r"
    }}
    timeout {{
        exit 1
    }}
    eof
}}
expect eof
"#,
            args_str,
            escaped_password
        );
        
        let script_path = "/tmp/ssh_keys_manager_expect.sh";
        std::fs::write(script_path, &expect_script).map_err(|e| format!("Expect script write error: {e}"))?;
        
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(script_path, std::fs::Permissions::from_mode(0o755));
        
        let output = Command::new("expect")
            .arg(script_path)
            .output()
            .map_err(|e| format!("Expect script error: {}. Consider installing sshpass: brew install sshpass", e))?;
        
        // Clean up expect script
        let _ = std::fs::remove_file(script_path);
        
        output
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
